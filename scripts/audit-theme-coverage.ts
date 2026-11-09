/**
 * 主题色覆盖矩阵审计：对 50 套导出模板逐一检测「标题是否跟随用户主题色」。
 *
 * 判定依据（与 buildThemeCss 的导出垫片行为一一对应）：
 * - 标题无内联 color → 主题规则特异性 (0,2,0) 压过工具类 (0,1,0) 且
 *   后置，主题色生效。
 * - 标题内联 color:var(--theme-primary|accent…)（含 -safe-on-dark 变体）
 *   → 显式接线，主题色生效。
 * - 标题内联字面色（hex/rgb 等）→ 被 `:not([style*="color"])` 排除，
 *   主题色不生效（固定为模板自带色）。
 *
 * 运行：node --import tsx scripts/audit-theme-coverage.ts
 * 输出 markdown 表格，建议重定向到 docs/research/theme-color-coverage.md。
 */
import { generateHtml } from '@/app/api/resume/[id]/export/builders';
import { TEMPLATES } from '@/lib/constants';
import { pdfResumeFixture } from '@/lib/pdf/resume-pdf.fixtures';

const HEADING_RE = /<h([1-3])[^>]*>/g;
const STYLE_COLOR_RE = /style="[^"]*color\s*:/i;
const THEME_VAR_RE = /color\s*:\s*var\(--theme-(primary|accent)(-color|-safe-on-dark)?\)/i;

interface Row {
  template: string;
  headings: number;
  inlineColored: number;
  themeFollowing: number;
}

async function main() {
  const rows: Row[] = [];
  for (const template of TEMPLATES) {
    const resume = {
      ...pdfResumeFixture(template),
      themeConfig: { primaryColor: '#ff0000', accentColor: '#0000ff' },
    };
    const html = await generateHtml(resume);
    let headings = 0;
    let themeFollowing = 0;
    for (const tag of html.match(HEADING_RE) ?? []) {
      headings += 1;
      // Follows theme: no inline color (cascade rule applies) or explicitly
      // wired to the theme variable. Fixed: inline literal color.
      if (!STYLE_COLOR_RE.test(tag) || THEME_VAR_RE.test(tag)) themeFollowing += 1;
    }
    rows.push({
      template,
      headings,
      inlineColored: headings - themeFollowing,
      themeFollowing,
    });
  }

  const immune = rows.filter((r) => r.inlineColored > 0);
  console.log('# 主题色覆盖矩阵（导出端，标题 h1–h3）\n');
  console.log(
    `> 由 \`node --import tsx scripts/audit-theme-coverage.ts\` 生成于 ${new Date().toISOString().slice(0, 10)}。判定规则见脚本头部注释。`,
  );
  console.log(
    `\n**汇总**：${rows.length} 套模板中，${immune.length} 套存在内联色标题（主题色对它们不生效）：${immune.map((r) => r.template).join('、')}。\n`,
  );
  console.log('| 模板 | 标题数 | 内联色（固定） | 无内联（跟随主题） |');
  console.log('| --- | --- | --- | --- |');
  for (const r of rows) {
    console.log(`| ${r.template} | ${r.headings} | ${r.inlineColored} | ${r.themeFollowing} |`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
