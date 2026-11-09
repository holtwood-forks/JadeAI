import { describe, expect, it } from 'vitest';
import { generateHtml, TEMPLATE_BUILDERS } from './builders';
import { TEMPLATES } from '@/lib/constants';
import { pdfResumeFixture } from '@/lib/pdf/resume-pdf.fixtures';

describe('TEMPLATE_BUILDERS 完备性', () => {
  it('与 TEMPLATES 常量一一对应（新增模板漏配 builder 在这里与编译期都会失败）', () => {
    const keys = Object.keys(TEMPLATE_BUILDERS);
    expect(keys).toHaveLength(TEMPLATES.length);
    for (const template of TEMPLATES) {
      expect(typeof TEMPLATE_BUILDERS[template], `missing builder for ${template}`).toBe('function');
    }
  });
});

describe('generateHtml 全模板导出回归', () => {
  // 哨兵文本断言只保证「内容不被模板丢弃」，不断言具体排版——排版差异由
  // pdf-regression.test.ts 里的深度分页用例覆盖。
  it.each(TEMPLATES)('%s：姓名与 summary 末行必须进入导出 HTML', async (template) => {
    const html = await generateHtml(pdfResumeFixture(template));
    expect(html).toContain('PDF Test 陈同学');
    expect(html).toContain('LAST_LINE_SENTINEL');
  });

  it.each(TEMPLATES)('%s：qr_codes 分节标签必须进入导出 HTML', async (template) => {
    const html = await generateHtml(pdfResumeFixture(template));
    expect(html).toContain('BOTTOM_QR_SENTINEL');
  });
});

describe('按模板默认主题色（elegant/modern/professional 首批迁移）', () => {
  it('未设置主题色时注入模板身份色，标题用 CSS 变量渲染', async () => {
    for (const template of ['elegant', 'modern', 'professional'] as const) {
      const html = await generateHtml(pdfResumeFixture(template));
      expect(html, `${template} 缺少模板默认色变量`).toContain('--theme-primary-color: #');
      expect(html, `${template} 标题未走 CSS 变量`).toContain('color:var(--theme-primary-color)');
    }
    // elegant 的身份色是金色；moden/professional 各自的身份色见 TEMPLATE_PRIMARY_DEFAULTS。
    const elegant = await generateHtml(pdfResumeFixture('elegant'));
    expect(elegant).toContain('--theme-primary-color: #d4af37');
  });

  it('用户显式设置主题色时覆盖模板默认色', async () => {
    const html = await generateHtml({
      ...pdfResumeFixture('elegant'),
      themeConfig: { primaryColor: '#ff0000' },
    });
    expect(html).toContain('--theme-primary-color: #ff0000');
    expect(html).not.toContain('--theme-primary-color: #d4af37');
  });
});

describe('第四批：双插槽与深色面模板', () => {
  it('多色模板注入主/辅双默认色', async () => {
    const coder = await generateHtml(pdfResumeFixture('coder'));
    expect(coder).toContain('--theme-primary-color: #3fb950');
    expect(coder).toContain('--theme-accent-color: #58a6ff');
    const developer = await generateHtml(pdfResumeFixture('developer'));
    expect(developer).toContain('--theme-primary-color: #e5c07b');
    expect(developer).toContain('--theme-accent-color: #98c379');
  });

  it('深色面模板使用 safe-on-dark 与 alpha 变体', async () => {
    const neon = await generateHtml(pdfResumeFixture('neon'));
    expect(neon).toContain('--theme-primary-safe-on-dark: #22d3ee');
    expect(neon).toContain('--theme-primary-alpha-60: #22d3ee60');
    expect(neon).toContain('color:var(--theme-primary-safe-on-dark)');
    const coder = await generateHtml(pdfResumeFixture('coder'));
    expect(coder).toContain('color:var(--theme-primary-safe-on-dark)');
    expect(coder).toContain('color:var(--theme-accent-safe-on-dark)');
  });

  it('深色用户主色被提亮为可读标题色', async () => {
    const neon = await generateHtml({
      ...pdfResumeFixture('neon'),
      themeConfig: { primaryColor: '#1a1a1a' },
    });
    // #1a1a1a 过暗，safe-on-dark 应注入提亮后的色而非原值
    expect(neon).not.toContain('--theme-primary-safe-on-dark: #1a1a1a');
    expect(neon).toContain('color:var(--theme-primary-safe-on-dark)');
  });

  it('japanese 对齐后分节标题跟随主题（默认暖灰）', async () => {
    const html = await generateHtml(pdfResumeFixture('japanese'));
    expect(html).toContain('--theme-primary-color: #a8a29e');
    expect(html).toContain('color:var(--theme-primary-color)');
  });

  it('two-column 与 sidebar 主栏标题分别跟随主色/辅色', async () => {
    const tc = await generateHtml(pdfResumeFixture('two-column'));
    expect(tc).toContain('color:var(--theme-primary-color)');
    const sb = await generateHtml(pdfResumeFixture('sidebar'));
    expect(sb).toContain('color:var(--theme-primary-color)');
    expect(sb).toContain('border-color:var(--theme-accent-color)');
    expect(sb).toContain('--theme-accent-color: #3b82f6');
  });
});

describe('药丸式标题主题化（teacher/medical）', () => {
  it('默认底色不变且文字对比度自动选择', async () => {
    const teacher = await generateHtml(pdfResumeFixture('teacher'));
    expect(teacher).toContain('--theme-primary-color: #9a3412');
    expect(teacher).toContain('--theme-primary-contrast-text: #ffffff');
    expect(teacher).toContain('background-color:var(--theme-primary-color)');
    const medical = await generateHtml(pdfResumeFixture('medical'));
    expect(medical).toContain('--theme-primary-color: #0d9488');
    expect(medical).toContain('--theme-primary-contrast-text: #ffffff');
  });

  it('浅色主色时药丸文字自动切深色', async () => {
    const html = await generateHtml({
      ...pdfResumeFixture('medical'),
      themeConfig: { primaryColor: '#ffff00' },
    });
    expect(html).toContain('--theme-primary-contrast-text: #111827');
  });
});
