import { resolveFontStack } from '@/lib/font-stacks';
import { parseThemeConfig } from '@/lib/resume/parse-theme-config';
import type { Template } from '@/lib/constants';
import type { ThemeConfig } from '@/types/resume';
import { DEFAULT_THEME } from './default-theme';

/**
 * Per-template default heading colors. Templates whose section headings are
 * an identity color (not a neutral text color) register that color here so an
 * untouched resume keeps its designed look, while an explicit user color
 * still overrides it everywhere (preview, PDF, HTML). Mirrors the
 * template-styles layering already used by the DOCX exporter.
 */
export const TEMPLATE_PRIMARY_DEFAULTS: Partial<Record<Template, string>> = {
  elegant: '#d4af37',
  modern: '#e94560',
  professional: '#1e3a5f',
  creative: '#7c3aed',
  designer: '#ff6b6b',
  startup: '#6366f1',
  formal: '#004d40',
  euro: '#1e40af',
  clean: '#0066cc',
  material: '#4f46e5',
  retro: '#78350f',
  gradient: '#a855f7',
  watercolor: '#4c1d95',
  rose: '#881337',
  architect: '#1e3a5f',
  legal: '#1a472a',
  teacher: '#9a3412',
  luxe: '#d4af37',
  // Batch 3: neutral-dark heading templates (identity = their exact text color).
  executive: '#2d3436',
  timeline: '#475569',
  nordic: '#64748b',
  corporate: '#0f172a',
  consultant: '#374151',
  finance: '#1e293b',
  metro: '#1e293b',
  blocks: '#37352f',
  magazine: '#1a1a1a',
  artistic: '#1e1b4b',
  swiss: '#18181b',
  berlin: '#18181b',
  scientist: '#0f172a',
  engineer: '#1e293b',
  card: '#18181b',
  zigzag: '#1e293b',
  // Batch 4: multi-slot templates. primary = dominant heading identity,
  // accent = secondary identity color (see TEMPLATE_ACCENT_DEFAULTS).
  'two-column': '#1a1a2e',
  sidebar: '#1e40af',
  coder: '#3fb950',
  developer: '#e5c07b',
  neon: '#22d3ee',
  japanese: '#a8a29e',
  medical: '#0d9488',
};

/** Secondary identity color for multi-color templates. Consumed by heading
 *  borders (sidebar), secondary headings (coder sidebar, developer name). */
export const TEMPLATE_ACCENT_DEFAULTS: Partial<Record<Template, string>> = {
  coder: '#58a6ff',
  sidebar: '#3b82f6',
  developer: '#98c379',
};

const FONT_SIZES = new Set(['small', 'medium', 'large']);
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'emoji',
  'fangsong',
  'cursive',
  'math',
]);

const FORBIDDEN_FONT_STACK_PATTERN = /[;{}]|\/\*|\*\/|url\s*\(|@import|[\r\n\\'"]/i;

type MarginSide = keyof ThemeConfig['margin'];
export type ThemeConfigInput = Partial<Omit<ThemeConfig, 'margin'>> & {
  margin?: Partial<ThemeConfig['margin']>;
};

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (!match) return fallback;

  const hex = match[1];
  if (hex.length === 3) {
    return `#${hex.split('').map((char) => `${char}${char}`).join('')}`.toLowerCase();
  }

  return `#${hex}`.toLowerCase();
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, numberValue));
}

function splitFontStack(fontStack: string): string[] {
  return fontStack
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeFontFamilyPart(value: string): string | null {
  const family = value.replace(/^['"]|['"]$/g, '').trim();
  if (!family || FORBIDDEN_FONT_STACK_PATTERN.test(family)) return null;
  if (!/^[\p{L}\p{N}\s._-]+$/u.test(family)) return null;

  const lower = family.toLowerCase();
  if (GENERIC_FAMILIES.has(lower)) return lower;
  if (/^[A-Za-z0-9_-]+$/.test(family)) return family;
  return `"${family}"`;
}

export function normalizeFontStack(value: unknown): string {
  const fallback = resolveFontStack(DEFAULT_THEME.fontFamily);
  if (typeof value !== 'string') return fallback;

  const resolved = resolveFontStack(value);
  const parts = splitFontStack(resolved)
    .map(normalizeFontFamilyPart)
    .filter((part): part is string => part !== null);
  if (parts.length === 0) return fallback;

  return parts.join(', ');
}

export function normalizeThemeConfig(theme?: ThemeConfigInput | null): ThemeConfig {
  // Legacy rows may hold a JSON string or an object with character keys
  // (from spreading a serialized theme). Decode before reading properties;
  // malformed values fall back to the defaults instead of throwing on read.
  let parsed: Partial<ThemeConfig> | null = null;
  try {
    parsed = parseThemeConfig(theme);
  } catch {
    parsed = null;
  }
  const source = (parsed || {}) as ThemeConfigInput;
  const marginSource: Partial<ThemeConfig['margin']> = source.margin || {};

  const margin = (['top', 'right', 'bottom', 'left'] as MarginSide[]).reduce<ThemeConfig['margin']>(
    (acc, side) => ({
      ...acc,
      [side]: normalizeNumber(marginSource[side], DEFAULT_THEME.margin[side], 0, 60),
    }),
    { ...DEFAULT_THEME.margin },
  );

  return {
    primaryColor: normalizeHexColor(source.primaryColor, DEFAULT_THEME.primaryColor),
    accentColor: normalizeHexColor(source.accentColor, DEFAULT_THEME.accentColor),
    fontFamily: normalizeFontStack(source.fontFamily),
    fontSize: typeof source.fontSize === 'string' && FONT_SIZES.has(source.fontSize)
      ? source.fontSize
      : DEFAULT_THEME.fontSize,
    lineSpacing: normalizeNumber(source.lineSpacing, DEFAULT_THEME.lineSpacing, 1, 2.5),
    margin,
    sectionSpacing: normalizeNumber(source.sectionSpacing, DEFAULT_THEME.sectionSpacing, 4, 64),
    avatarStyle: source.avatarStyle === 'circle' || source.avatarStyle === 'oneInch'
      ? source.avatarStyle
      : DEFAULT_THEME.avatarStyle,
  };
}

export function mergeThemeConfig(theme?: ThemeConfigInput | null, template?: string): ThemeConfig {
  let parsed: Partial<ThemeConfig> | null = null;
  try {
    parsed = parseThemeConfig(theme);
  } catch {
    parsed = null;
  }
  const source = (parsed || {}) as ThemeConfigInput;
  // Merge order: global default → per-template default → user input. A stored
  // themeConfig without an explicit color keeps the template's designed
  // identity color; any explicit color (user picker, preset) always wins.
  const templatePrimary = template ? TEMPLATE_PRIMARY_DEFAULTS[template as Template] : undefined;
  const templateAccent = template ? TEMPLATE_ACCENT_DEFAULTS[template as Template] : undefined;
  return normalizeThemeConfig({
    ...DEFAULT_THEME,
    ...(templatePrimary ? { primaryColor: templatePrimary } : {}),
    ...(templateAccent ? { accentColor: templateAccent } : {}),
    ...source,
    margin: {
      ...DEFAULT_THEME.margin,
      ...(source.margin || {}),
    },
  });
}
