
import { CHINESE_RESUME_FONT_STACK } from '@/lib/font-stacks';
import { buildThemeCss } from './build-theme-css';
import { DEFAULT_THEME } from './default-theme';
import { mergeThemeConfig, normalizeFontStack, normalizeThemeConfig } from './theme-config';
import { test, expect } from 'vitest';

test('decodes legacy theme JSON and character-key objects on read', () => {
  expect(normalizeThemeConfig('{"accentColor":"#123456"}' as never).accentColor).toBe('#123456');
  const characterKeys = Object.fromEntries(
    Array.from('{"accentColor":"#654321"}', (character, index) => [index, character])
  );
  expect(normalizeThemeConfig(characterKeys as never).accentColor).toBe('#654321');
  // Malformed legacy values fall back to defaults instead of throwing on read.
  expect(normalizeThemeConfig('not json' as never).accentColor).toBe(DEFAULT_THEME.accentColor);
});

test('normalizes theme colors, numbers, and font stacks', () => {
  const theme = mergeThemeConfig({
    primaryColor: '#ABC',
    accentColor: 'not-a-color',
    fontFamily: CHINESE_RESUME_FONT_STACK,
    fontSize: 'giant',
    lineSpacing: Number.POSITIVE_INFINITY,
    margin: { top: -10, right: 100, bottom: Number.NaN, left: 12 },
    sectionSpacing: 100,
  });

  expect(theme.primaryColor).toBe('#aabbcc');
  expect(theme.accentColor).toBe(DEFAULT_THEME.accentColor);
  expect(theme.fontFamily).toBe(CHINESE_RESUME_FONT_STACK);
  expect(theme.fontSize).toBe(DEFAULT_THEME.fontSize);
  expect(theme.lineSpacing).toBe(DEFAULT_THEME.lineSpacing);
  expect(theme.margin).toEqual({ top: 0, right: 60, bottom: 20, left: 12 });
  expect(theme.sectionSpacing).toBe(64);
});

test('rejects font stacks that can break out of CSS declarations', () => {
  const fallback = normalizeFontStack(DEFAULT_THEME.fontFamily);

  expect(normalizeFontStack('Inter; color:red')).toBe(fallback);
  expect(normalizeFontStack('Inter, url(https://example.com/font.woff2)')).toBe('Inter');
  expect(normalizeFontStack('Inter /* comment */')).toBe(fallback);
  expect(normalizeFontStack('Inter } body { display:none')).toBe(fallback);
});

test('normalizes font stacks token-by-token and keeps valid families', () => {
  const fallback = normalizeFontStack(DEFAULT_THEME.fontFamily);

  expect(normalizeFontStack('"Inter", "Noto Sans SC", sans-serif')).toBe('Inter, sans-serif, "Noto Sans SC"');
  expect(normalizeFontStack('sans-serif, "Noto Sans SC", "Inter", url(https://bad.font)')).toBe('sans-serif, "Noto Sans SC", Inter');
  expect(normalizeFontStack('url(https://bad.font), ;;;')).toBe(fallback);
});

test('buildThemeCss only emits normalized theme values', () => {
  const css = buildThemeCss({
    selector: '.resume',
    template: 'classic',
    theme: {
      ...DEFAULT_THEME,
      primaryColor: '#bad-input',
      accentColor: '#DEF',
      fontFamily: 'Inter; color:red',
      lineSpacing: Number.NaN,
      margin: { top: -1, right: 999, bottom: 20, left: 20 },
      sectionSpacing: 999,
    },
  });

  expect(css).toMatch(/--theme-primary-color: #1a1a1a/);
  expect(css).toMatch(/--theme-accent-color: #ddeeff/);
  expect(css).not.toMatch(/color:red/);
  expect(css).toMatch(/--theme-font-family: Inter, sans-serif, "Noto Sans SC"/);
  expect(css).toMatch(/--base-margin-top: 0px/);
  expect(css).toMatch(/--base-margin-right: 60px/);
  expect(css).toMatch(/--base-section-spacing: 64px/);
});

test('per-template primary defaults fill in only when the user set no color', () => {
  // Untouched resume on elegant keeps its designed gold headings.
  expect(mergeThemeConfig(null, 'elegant').primaryColor).toBe('#d4af37');
  expect(mergeThemeConfig({}, 'modern').primaryColor).toBe('#e94560');
  // An explicit color always wins over the template default.
  expect(mergeThemeConfig({ primaryColor: '#ff0000' }, 'elegant').primaryColor).toBe('#ff0000');
  // Templates without a registered default fall back to the global default.
  expect(mergeThemeConfig(null, 'classic').primaryColor).toBe(DEFAULT_THEME.primaryColor);
  expect(mergeThemeConfig(null).primaryColor).toBe(DEFAULT_THEME.primaryColor);
});

test('per-template accent defaults fill in for multi-color templates', () => {
  expect(mergeThemeConfig(null, 'coder').accentColor).toBe('#58a6ff');
  expect(mergeThemeConfig(null, 'sidebar').accentColor).toBe('#3b82f6');
  expect(mergeThemeConfig(null, 'developer').accentColor).toBe('#98c379');
  // Explicit accent wins; templates without an accent default keep global.
  expect(mergeThemeConfig({ accentColor: '#00ff00' }, 'coder').accentColor).toBe('#00ff00');
  expect(mergeThemeConfig(null, 'classic').accentColor).toBe(DEFAULT_THEME.accentColor);
});
