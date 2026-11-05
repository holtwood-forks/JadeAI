import { accessSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

import type { PdfLayout } from './layout';
import {
  CONTINUOUS_WIDTH_MM,
  CONTINUOUS_WIDTH_PX,
  MAX_CONTINUOUS_HEIGHT_PX,
  CONTINUOUS_RESOURCE_TIMEOUT_MS,
  CONTINUOUS_RENDER_TIMEOUT_MS,
} from './continuous-layout';
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  applyPaginationStrategy,
  type PaginationContext,
  type PaginationStrategyResult,
} from './pagination-strategy';

const SPARTICUZ_CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar';
const LOCAL_CHROME_CANDIDATES = [
  process.env.PROGRAMFILES ? `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe` : null,
  process.env['PROGRAMFILES(X86)'] ? `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe` : null,
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null,
  process.env.PROGRAMFILES ? `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe` : null,
  process.env['PROGRAMFILES(X86)'] ? `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe` : null,
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe` : null,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser-unstable',
  '/snap/bin/chromium',
].filter((path): path is string => Boolean(path));
let hasWarnedAboutBundledChromiumFallback = false;

type ChromiumEnv = Partial<Record<'ALLOW_CHROMIUM_DOWNLOAD' | 'CHROME_PATH' | 'VERCEL', string | undefined>>;

type BrowserLaunchPlan =
  | { kind: 'local'; executablePath: string; args?: string[] }
  | { kind: 'download' };

interface PdfOptions {
  fitOnePage?: boolean;
  layout?: PdfLayout;
  signal?: AbortSignal;
  paginationContext?: PaginationContext;
  onPaginationResult?: (result: PaginationStrategyResult) => void;
}

async function launchBundledChromium(signal?: AbortSignal) {
  const chromium = await import('@sparticuz/chromium-min');
  const executablePath = await chromium.default.executablePath(SPARTICUZ_CHROMIUM_PACK_URL);
  // A cancelled binary download must never start a late Chromium process.
  signal?.throwIfAborted();
  return puppeteer.launch({
    args: chromium.default.args,
    executablePath,
    headless: true,
    signal,
    timeout: 15_000,
  });
}

const PATH_CHROME_BINARIES = [
  'chromium',
  'chromium-browser',
  'google-chrome',
  'google-chrome-stable',
];

export function resolveLocalChromeExecutable(
  hasAccess: (executablePath: string) => boolean = (executablePath) => {
    try {
      accessSync(executablePath);
      return true;
    } catch {
      return false;
    }
  },
): string | null {
  for (const executablePath of LOCAL_CHROME_CANDIDATES) {
    if (hasAccess(executablePath)) {
      return executablePath;
    }
  }

  // Also honour PATH. WSL and per-user installs commonly put the browser in
  // ~/.local/bin, which is not in the fixed candidate list, and silently
  // skipping every PDF regression test looks like a green run.
  const pathEnv = process.env.PATH || '';
  for (const name of PATH_CHROME_BINARIES) {
    for (const dir of pathEnv.split(delimiter)) {
      if (!dir) continue;
      const executablePath = join(dir, name);
      if (hasAccess(executablePath)) {
        return executablePath;
      }
    }
  }

  return null;
}

function warnBundledChromiumFallback() {
  if (hasWarnedAboutBundledChromiumFallback) {
    return;
  }

  hasWarnedAboutBundledChromiumFallback = true;
  console.warn(
    'No local Chrome/Chromium found. Falling back to bundled Chromium because ALLOW_CHROMIUM_DOWNLOAD=true.',
  );
}

function defaultHasAccess(executablePath: string): boolean {
  try {
    accessSync(executablePath);
    return true;
  } catch {
    return false;
  }
}

export function resolveBrowserLaunchPlan(
  env: ChromiumEnv = process.env as ChromiumEnv,
  hasAccess: (executablePath: string) => boolean = defaultHasAccess,
): BrowserLaunchPlan {
  const chromePath = env.CHROME_PATH?.trim();
  if (chromePath) {
    if (hasAccess(chromePath)) {
      return {
        kind: 'local',
        executablePath: chromePath,
        args: LAUNCH_ARGS,
      };
    }

    // Upstream #85: a missing CHROME_PATH must not abort the export. Warn and
    // fall through to autodetection (and the explicit download fallback)
    // instead of throwing before the candidate list is considered.
    console.warn(
      `CHROME_PATH points to a missing or inaccessible executable (${chromePath}); falling back to autodetection.`
    );
  }

  const executablePath = resolveLocalChromeExecutable(hasAccess);
  if (executablePath) {
    return { kind: 'local', executablePath, args: LAUNCH_ARGS };
  }

  if (env.ALLOW_CHROMIUM_DOWNLOAD === 'true') {
    return { kind: 'download' };
  }

  const environment = env.VERCEL ? 'Vercel' : 'this environment';
  throw new Error(
    `No local Chrome/Chromium executable found for PDF export in ${environment}. ` +
    'Install Chromium and set CHROME_PATH, or explicitly set ALLOW_CHROMIUM_DOWNLOAD=true to permit the runtime download fallback.',
  );
}

// Container/host-friendly Chromium flags. --disable-dev-shm-usage avoids the
// small default /dev/shm that makes Chrome crash in Docker on constrained boxes
// (a common cause of the process dying mid-render → 502, issue #85).
const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

async function getBrowser(signal?: AbortSignal) {
  signal?.throwIfAborted();
  const launchPlan = resolveBrowserLaunchPlan();

  if (launchPlan.kind === 'local') {
    return puppeteer.launch({
      executablePath: launchPlan.executablePath,
      args: launchPlan.args,
      headless: true,
      signal,
      timeout: 15_000,
    });
  }

  warnBundledChromiumFallback();
  return launchBundledChromium(signal);
}

/**
 * tsx/esbuild 的 keepNames 会把 page.evaluate 回调内的具名函数包成
 * `__name(fn, "fn")`。回调被序列化进浏览器后没有该辅助函数，会抛
 * ReferenceError，因此在新文档创建前先注入垫片。
 */
const KEEP_NAMES_SHIM = `window.__name = (f, n) => f;`;

function patchPageForEvaluate(page: import('puppeteer-core').Page) {
  return page.evaluateOnNewDocument(KEEP_NAMES_SHIM);
}

async function withTimeout<T>(operation: Promise<T>, timeout: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function closePdfBrowser(browser: Browser): Promise<void> {
  try {
    await withTimeout(browser.close(), 5_000, 'Chromium cleanup timed out');
  } catch {
    // A hung renderer must not leave a Chromium process behind.
    browser.process()?.kill('SIGKILL');
  }
}

const PDF_BROWSER_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

// Survive Next.js dev reloads: a module-local browser would leak a Chromium
// process on every hot reload.
const pdfBrowserState = globalThis as typeof globalThis & {
  __jadePdfBrowser?: Browser;
  __jadePdfBrowserLaunch?: Promise<Browser>;
  __jadePdfIdleTimer?: ReturnType<typeof setTimeout>;
  __jadePdfExitHooksInstalled?: boolean;
};

function clearIdleTimer(): void {
  if (pdfBrowserState.__jadePdfIdleTimer) {
    clearTimeout(pdfBrowserState.__jadePdfIdleTimer);
    pdfBrowserState.__jadePdfIdleTimer = undefined;
  }
}

function scheduleIdleClose(): void {
  clearIdleTimer();
  if (!pdfBrowserState.__jadePdfBrowser) return;
  const timer = setTimeout(() => {
    void closeSharedBrowser();
  }, PDF_BROWSER_IDLE_TIMEOUT_MS);
  timer.unref?.();
  pdfBrowserState.__jadePdfIdleTimer = timer;
}

async function closeSharedBrowser(): Promise<void> {
  clearIdleTimer();
  const browser = pdfBrowserState.__jadePdfBrowser;
  pdfBrowserState.__jadePdfBrowser = undefined;
  pdfBrowserState.__jadePdfBrowserLaunch = undefined;
  if (browser) {
    await closePdfBrowser(browser);
  }
}

function installPdfExitHooks(): void {
  if (pdfBrowserState.__jadePdfExitHooksInstalled) return;
  pdfBrowserState.__jadePdfExitHooksInstalled = true;
  const shutdown = () => {
    void closeSharedBrowser();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

async function getSharedBrowser(signal?: AbortSignal): Promise<Browser> {
  signal?.throwIfAborted();

  const existing = pdfBrowserState.__jadePdfBrowser;
  if (existing?.connected) {
    scheduleIdleClose();
    return existing;
  }
  if (existing) {
    pdfBrowserState.__jadePdfBrowser = undefined;
  }

  if (!pdfBrowserState.__jadePdfBrowserLaunch) {
    const launch = launchPdfBrowser(signal)
      .then((browser) => {
        pdfBrowserState.__jadePdfBrowser = browser;
        browser.on('disconnected', () => {
          if (pdfBrowserState.__jadePdfBrowser === browser) {
            pdfBrowserState.__jadePdfBrowser = undefined;
            clearIdleTimer();
          }
        });
        installPdfExitHooks();
        scheduleIdleClose();
        return browser;
      })
      .finally(() => {
        pdfBrowserState.__jadePdfBrowserLaunch = undefined;
      });
    pdfBrowserState.__jadePdfBrowserLaunch = launch;
  }

  return await pdfBrowserState.__jadePdfBrowserLaunch;
}

function isRenderTimeout(error: unknown): boolean {
  return error instanceof Error && /timed out/i.test(error.message);
}

async function launchPdfBrowser(signal?: AbortSignal): Promise<Browser> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('Chromium launch timed out. Retry PDF export.')),
    15_000,
  );
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  const launch = getBrowser(controller.signal);
  let rejectCancelled: (() => void) | undefined;
  try {
    const cancelled = new Promise<never>((_, reject) => {
      rejectCancelled = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', rejectCancelled, { once: true });
    });
    return await Promise.race([launch, cancelled]);
  } catch (error) {
    // If launch finishes after its deadline, still dispose of its browser.
    void launch.then(closePdfBrowser).catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    if (rejectCancelled) controller.signal.removeEventListener('abort', rejectCancelled);
  }
}

async function renderContinuousPage(browser: Browser, html: string): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await patchPageForEvaluate(page);
    await page.setViewport({ width: Math.ceil(CONTINUOUS_WIDTH_PX), height: A4_HEIGHT_PX });
    // Measure using the same media and fixed CSS width as the final PDF.
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'load', timeout: CONTINUOUS_RESOURCE_TIMEOUT_MS });
    await page.waitForFunction(
      () =>
        document.fonts.status === 'loaded'
        && Array.from(document.images).every((img) => img.complete),
      { timeout: CONTINUOUS_RESOURCE_TIMEOUT_MS },
    );

    const dimensions = await page.evaluate(async () => {
      const globalScope = globalThis as { __name?: <T>(fn: T, name?: string) => T };
      if (typeof globalScope.__name === 'undefined') {
        globalScope.__name = <T,>(fn: T): T => fn;
      }
      for (const image of Array.from(document.images)) {
        if (image.naturalWidth === 0) {
          throw new Error('A resume image failed to load. Retry PDF export.');
        }
        await image.decode();
      }
      const root = document.querySelector<HTMLElement>('.resume-export');
      if (!root) throw new Error('Continuous PDF requires a resume export container');
      const measure = () => {
        const rect = root.getBoundingClientRect();
        let bottom = rect.bottom;
        for (const el of root.querySelectorAll('*')) {
          bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
        }
        return {
          height: Math.max(rect.height, root.scrollHeight, bottom - rect.top),
          width: Math.max(rect.width, root.scrollWidth),
        };
      };
      let previous = measure();
      let stableFrames = 0;
      while (stableFrames < 3) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const next = measure();
        stableFrames =
          Math.abs(next.height - previous.height) < 0.25
          && Math.abs(next.width - previous.width) < 0.25
            ? stableFrames + 1
            : 0;
        previous = next;
      }
      return previous;
    });

    // Round up and allow 2 CSS pixels for Chromium's print-unit rounding.
    const height = Math.ceil(dimensions.height) + 2;
    if (!Number.isFinite(height) || height <= 2 || height > MAX_CONTINUOUS_HEIGHT_PX) {
      throw new Error('Resume exceeds the continuous PDF height limit. Use an A4 layout instead.');
    }
    if (dimensions.width > CONTINUOUS_WIDTH_PX + 1) {
      throw new Error('Resume exceeds the continuous PDF width. Use an A4 layout instead.');
    }
    await page.addStyleTag({
      content: `
        @page { size: ${CONTINUOUS_WIDTH_MM}mm ${height}px; margin: 0; }
        .resume-export > div { min-height: ${height - 12}px !important; }
      `,
    });
    const pdf = await page.pdf({
      width: `${CONTINUOUS_WIDTH_MM}mm`,
      height: `${height}px`,
      preferCSSPageSize: true,
      scale: 1,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      timeout: 15_000,
      // Fonts were already awaited under the resource and render deadlines.
      waitForFonts: false,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}

async function renderA4Page(
  browser: Browser,
  html: string,
  options: PdfOptions,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await patchPageForEvaluate(page);

    await page.setViewport({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX });
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );

    const fitOnePage =
      options.layout === 'fit-one-page' || (!options.layout && options.fitOnePage);
    await applyPaginationStrategy(page, {
      mode: fitOnePage ? 'fit-one-page' : 'prevent-blank-page',
      context: options.paginationContext,
      onResult: options.onPaginationResult,
    });

    const pdf = await page.pdf({
      format: 'A4',
      preferCSSPageSize: true,
      scale: 1,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}

export async function generatePdf(html: string, options: PdfOptions = {}): Promise<Buffer> {
  options.signal?.throwIfAborted();
  const browser = await getSharedBrowser(options.signal);
  let onAbort: (() => void) | undefined;
  try {
    options.signal?.throwIfAborted();
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () =>
        reject(options.signal?.reason ?? new DOMException('PDF request cancelled', 'AbortError'));
      options.signal?.addEventListener('abort', onAbort, { once: true });
    });
    const render =
      options.layout === 'continuous'
        ? renderContinuousPage(browser, html)
        : renderA4Page(browser, html, options);
    return await withTimeout(
      Promise.race([render, cancelled]),
      CONTINUOUS_RENDER_TIMEOUT_MS,
      'PDF rendering timed out. Retry or use an A4 layout.',
    );
  } catch (error) {
    // A timeout or abort can leave a stuck renderer behind. Recycle the
    // shared browser so the next export starts from a clean process.
    if (options.signal?.aborted || isRenderTimeout(error) || !browser.connected) {
      await closeSharedBrowser();
    }
    throw error;
  } finally {
    if (onAbort) options.signal?.removeEventListener('abort', onAbort);
    if (browser.connected) scheduleIdleClose();
  }
}
