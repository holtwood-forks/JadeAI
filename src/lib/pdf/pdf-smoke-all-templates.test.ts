import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '@/lib/constants';
import { pdfResumeFixture } from './resume-pdf.fixtures';
import { renderResumePdf } from './render-resume-pdf';
import { resolveBrowserLaunchPlan } from './generate-pdf';

// 全模板 PDF 冒烟：每套模板渲染一次真实 A4 PDF，断言合法 PDF、页数上限
// 与哨兵文本可提取。深度分页断言（压缩/防空白页/连续长页）仍由
// pdf-regression.test.ts 的高风险用例覆盖，这里补的是「其余 43 套模板
// 的 PDF 渲染从未被真实浏览器验证过」的空白。
//
// 真实 Chromium 渲染较慢（每次冷启动），单测超时放宽到 60s；
// 无浏览器环境（部分 CI/开发机）自动跳过，与 pdf-regression 同策略。

const PDF_SMOKE_SKIP_REASON = (() => {
  try {
    resolveBrowserLaunchPlan();
    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('No local Chrome/Chromium executable found') ? message : undefined;
  }
})();

async function renderAndExtract(template: string) {
  const buffer = await renderResumePdf(pdfResumeFixture(template), 'a4');
  const mupdf = await import('mupdf');
  const document = mupdf.Document.openDocument(new Uint8Array(buffer), 'application/pdf');
  const pageCount = document.countPages();
  const text: string[] = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    text.push(document.loadPage(pageIndex).toStructuredText('preserve-whitespace').asText());
  }
  return { buffer, pageCount, text: text.join('\n') };
}

describe('全模板 PDF 冒烟（50 套 × 真实渲染）', () => {
  it.each(TEMPLATES)('%s：合法 PDF、页数 ≤ 6、哨兵文本可提取', async (template) => {
    if (PDF_SMOKE_SKIP_REASON) return; // 环境无浏览器时静默跳过
    const { buffer, pageCount, text } = await renderAndExtract(template);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(pageCount).toBeGreaterThanOrEqual(1);
    expect(pageCount).toBeLessThanOrEqual(6);
    expect(text).toContain('LAST_LINE_SENTINEL');
    // 部分模板对姓名使用 text-transform:uppercase / letter-spacing，
    // 提取文本随之变大写并可能插入空格；去空白后做大小写不敏感比较。
    expect(text.replace(/\s+/g, '').toLowerCase()).toContain('pdftest');
  });
});
