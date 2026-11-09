import { describe, expect, it } from 'vitest';
import { generateHtml } from './builders';
import { TEMPLATES } from '@/lib/constants';
import { pdfResumeFixture } from '@/lib/pdf/resume-pdf.fixtures';

const HEADING_RE = /<h([1-3])[^>]*>/g;
const STYLE_COLOR_RE = /style="[^"]*color\s*:/i;
const THEME_VAR_RE = /color\s*:\s*var\(--theme-(primary|accent)(-color|-safe-on-dark)?\)/i;

/**
 * 主题覆盖回归网：标题使用字面色的模板集合不得超出已文档化的设计性保留清单
 * （docs/research/theme-color-coverage.md）。新增「有意不跟随主题」的模板时，
 * 需同步更新此清单与矩阵文档——这是刻意的决策门槛，不是意外漂移的容忍度。
 */
const DOCUMENTED_FIXED_HEADING_TEMPLATES = new Set([
  'elegant', // 姓名中性色（h1）
  'medical', // 姓名深青（h1）
  'coder', // 主栏中性标题（深色面已走 safe-on-dark）
  'japanese', // 姓名中性色（h1）
  'luxe', // 姓名/条目中性色
  'mosaic', // 分节循环四色板（设计性整体保留）
]);

async function literalColoredHeadingCount(template: string): Promise<number> {
  const html = await generateHtml(pdfResumeFixture(template));
  let fixed = 0;
  for (const tag of html.match(HEADING_RE) ?? []) {
    if (STYLE_COLOR_RE.test(tag) && !THEME_VAR_RE.test(tag)) fixed += 1;
  }
  return fixed;
}

describe('主题覆盖回归网', () => {
  it('字面色标题的模板集合 ⊆ 文档化保留清单（当前 44 套跟随主题）', async () => {
    const offenders: string[] = [];
    for (const template of TEMPLATES) {
      if (await literalColoredHeadingCount(template) > 0) offenders.push(template);
    }
    const undocumented = offenders.filter((t) => !DOCUMENTED_FIXED_HEADING_TEMPLATES.has(t));
    expect(
      undocumented,
      `以下模板的标题退回了字面色（未在保留清单中）：${undocumented.join('、')}。` +
        '若是有意保留，请同步更新 DOCUMENTED_FIXED_HEADING_TEMPLATES 与 docs/research/theme-color-coverage.md。',
    ).toEqual([]);
    expect(offenders.length).toBeLessThanOrEqual(DOCUMENTED_FIXED_HEADING_TEMPLATES.size);
  });

  it('已文档化保留的模板保持其保留状态（清单与实际一致）', async () => {
    for (const template of DOCUMENTED_FIXED_HEADING_TEMPLATES) {
      expect(await literalColoredHeadingCount(template)).toBeGreaterThan(0);
    }
  });
});
