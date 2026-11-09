/**
 * Resource knobs for PDF export.
 *
 * Chromium is the only heavy part of this app: one idle browser costs
 * ~100–200 MB and each concurrent render adds a renderer process. Both defaults
 * target a 2 GB deployment; constrained boxes can lower them at the cost of
 * slower exports.
 */
export const DEFAULT_MAX_CONCURRENT_RESUME_PDFS = 2;
export const DEFAULT_PDF_BROWSER_IDLE_MS = 10 * 60 * 1000;

export function resolveMaxConcurrentResumePdfs(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.PDF_MAX_CONCURRENT);
  if (!Number.isInteger(raw) || raw < 1) return DEFAULT_MAX_CONCURRENT_RESUME_PDFS;
  // More than 4 concurrent renders buys nothing and exhausts small hosts.
  return Math.min(raw, 4);
}

export function resolvePdfBrowserIdleMs(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.PDF_BROWSER_IDLE_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_PDF_BROWSER_IDLE_MS;
  // Never reclaim almost immediately (the next export would pay a full launch)
  // and never keep an idle browser around for more than an hour.
  return Math.min(Math.max(raw, 10_000), 60 * 60 * 1000);
}
