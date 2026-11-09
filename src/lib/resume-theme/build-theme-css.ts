import { BACKGROUND_TEMPLATES } from '@/lib/constants';
import type { ThemeConfig } from '@/types/resume';
import { DEFAULT_THEME } from './default-theme';
import { mergeThemeConfig } from './theme-config';

const FONT_SIZE_SCALE: Record<string, { body: string; h1: string; h2: string; h3: string }> = {
  small: { body: '12px', h1: '22px', h2: '15px', h3: '13px' },
  medium: { body: '14px', h1: '26px', h2: '17px', h3: '15px' },
  large: { body: '16px', h1: '30px', h2: '19px', h3: '17px' },
};

export { DEFAULT_THEME, mergeThemeConfig };

interface BuildThemeCssOptions {
  selector: string;
  template: string;
  theme: ThemeConfig;
  includeNeedsPadding?: boolean;
}

function relativeLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isDark(hex: string): boolean {
  return relativeLuminance(hex) < 0.4;
}

function mixWithWhite(hex: string, ratio: number): string {
  const c = hex.replace('#', '');
  const channel = (start: number) => {
    const v = parseInt(c.substring(start, start + 2), 16);
    return Math.round(v + (255 - v) * ratio)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/**
 * Heading color for dark template surfaces (neon/coder sidebars): the user's
 * color as-is when already light enough, otherwise lightened toward white
 * until readable (≥ 0.45 relative luminance ≈ 8:1 on #0d1117).
 */
export function safeOnDarkColor(hex: string): string {
  let color = hex.replace('#', '').length === 6 ? hex : `#${hex}`;
  for (let i = 0; i < 5 && relativeLuminance(color) < 0.45; i++) {
    color = mixWithWhite(color, 0.2);
  }
  return color;
}

/** Text color that stays readable on a filled primary/accent surface
 *  (pill headings): dark text on light fills, white on dark fills. */
export function contrastTextColor(hex: string): string {
  return relativeLuminance(hex) >= 0.5 ? '#111827' : '#ffffff';
}

/** #rrggbb + alpha suffix, e.g. withAlpha('#22d3ee', '40') → '#22d3ee40'. */
function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

const ALPHA_STEPS = ['60', '40', '20', '08', '05'];

export function buildThemeCss({
  selector,
  template,
  theme,
  includeNeedsPadding = true,
}: BuildThemeCssOptions): string {
  const safeTheme = mergeThemeConfig(theme, template);
  const fs = FONT_SIZE_SCALE[safeTheme.fontSize] || FONT_SIZE_SCALE.medium;
  const margin = safeTheme.margin;
  const needsPadding = !BACKGROUND_TEMPLATES.has(template);
  const primaryIsDark = isDark(safeTheme.primaryColor);
  const needsPaddingCss = includeNeedsPadding ? `--needs-padding: ${needsPadding ? '1' : '0'};` : '';
  const themeVariables = `
       --theme-font-family: ${safeTheme.fontFamily};
       --theme-primary-color: ${safeTheme.primaryColor};
       --theme-accent-color: ${safeTheme.accentColor};
       --theme-primary-safe-on-dark: ${safeOnDarkColor(safeTheme.primaryColor)};
       --theme-accent-safe-on-dark: ${safeOnDarkColor(safeTheme.accentColor)};
       --theme-primary-contrast-text: ${contrastTextColor(safeTheme.primaryColor)};
       --theme-accent-contrast-text: ${contrastTextColor(safeTheme.accentColor)};
${ALPHA_STEPS.map((a) => `       --theme-primary-alpha-${a}: ${withAlpha(safeTheme.primaryColor, a)};`).join('\n')}
${ALPHA_STEPS.map((a) => `       --theme-accent-alpha-${a}: ${withAlpha(safeTheme.accentColor, a)};`).join('\n')}
       --base-body-size: ${fs.body};
       --base-h1-size: ${fs.h1};
       --base-h2-size: ${fs.h2};
       --base-h3-size: ${fs.h3};
       --base-line-spacing: ${safeTheme.lineSpacing};
       --base-section-spacing: ${safeTheme.sectionSpacing}px;
       --base-margin-top: ${margin.top}px;
       --base-margin-right: ${margin.right}px;
       --base-margin-bottom: ${margin.bottom}px;
       --base-margin-left: ${margin.left}px;
       --font-sans: var(--theme-font-family);
       --text-xs: calc(var(--base-body-size) * 0.8571);
       --text-sm: var(--base-body-size);
       --text-base: calc(var(--base-body-size) * 1.1429);
       --text-lg: calc(var(--base-body-size) * 1.2857);
       --text-xl: calc(var(--base-body-size) * 1.4286);
       --text-2xl: calc(var(--base-body-size) * 1.7143);
       --text-3xl: calc(var(--base-body-size) * 2.1429);
       --text-4xl: calc(var(--base-body-size) * 2.5714);
       --text-xs--line-height: var(--base-line-spacing);
       --text-sm--line-height: var(--base-line-spacing);
       --text-base--line-height: var(--base-line-spacing);
       --text-lg--line-height: var(--base-line-spacing);
       --text-xl--line-height: var(--base-line-spacing);
       --text-2xl--line-height: var(--base-line-spacing);
       --text-3xl--line-height: var(--base-line-spacing);
       --text-4xl--line-height: var(--base-line-spacing);
       --leading-relaxed: var(--base-line-spacing);
       --leading-loose: var(--base-line-spacing);
       --leading-normal: var(--base-line-spacing);
       ${needsPaddingCss}
  `;

  return `
      ${selector} {
        font-family: var(--theme-font-family, ${safeTheme.fontFamily});
      }
      ${selector} > div {
        font-family: var(--theme-font-family, ${safeTheme.fontFamily}) !important;
        font-size: var(--base-body-size);
        line-height: var(--base-line-spacing);
        ${needsPadding ? `padding-top: ${margin.top}px !important; padding-right: ${margin.right}px !important; padding-bottom: ${margin.bottom}px !important; padding-left: ${margin.left}px !important;` : ''}
        ${themeVariables}
      }
      ${selector} :where(h1) {
        font-size: var(--base-h1-size);
        line-height: var(--base-line-spacing);
      }
      ${selector} :where(h2) {
        font-size: var(--base-h2-size);
        line-height: var(--base-line-spacing);
      }
      ${selector} :where(h3) {
        font-size: var(--base-h3-size);
        line-height: var(--base-line-spacing);
      }
      ${selector} :where(h1, h2, h3):not([style*="color"]) {
        color: var(--theme-primary-color);
      }
      ${selector} :where(h2[class*="border-b"], [data-section-heading]) {
        border-color: var(--theme-accent-color);
      }
      ${selector} [data-section] {
        ${needsPadding ? 'margin-bottom' : 'padding-bottom'}: var(--base-section-spacing) !important;
      }
      ${primaryIsDark ? `
      ${selector} [style*="background"][style*="#"] h1:not([style*="color"]),
      ${selector} [style*="background"][style*="#"] h2:not([style*="color"]),
      ${selector} [style*="background"][style*="#"] h3:not([style*="color"]),
      ${selector} [style*="background"][style*="linear-gradient"] h1:not([style*="color"]),
      ${selector} [style*="background"][style*="linear-gradient"] h2:not([style*="color"]),
      ${selector} [style*="background"][style*="linear-gradient"] h3:not([style*="color"]),
      ${selector} .bg-black h1:not([style*="color"]),
      ${selector} .bg-black h2:not([style*="color"]),
      ${selector} .bg-black h3:not([style*="color"]) {
        color: #ffffff !important;
      }` : ''}
    `;
}
