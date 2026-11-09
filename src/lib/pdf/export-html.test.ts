import { createHash } from 'node:crypto';

import { generatePdfHtml } from '@/app/api/resume/[id]/export/builders';
import { type ResumeWithSections } from '@/app/api/resume/[id]/export/utils';
import { CHINESE_RESUME_FONT_STACK } from '@/lib/font-stacks';
import {
  getPdfRegressionFixture,
  type PdfRegressionFixtureName,
} from './__fixtures__/resume-fixtures';
import { describe, expect, it, test } from 'vitest';

const TEST_FONT_BASE_URL = 'http://jadeai.test';

interface HtmlRegressionCase {
  fixtureName: PdfRegressionFixtureName;
  expectedLength: number;
  expectedSha256: string;
  dataAttributes: Record<string, string>;
  anchors: string[];
  snippets: string[];
}

const REQUIRED_PDF_PAGINATION_SNIPPETS = [
  '@page {        size: A4;',
  '[data-section],\n       [data-pdf-entry],\n       [data-pdf-entry-header] { break-inside: auto !important; overflow: visible !important; }',
  '[data-section] [class*="space-y"] > div, .item { break-inside: avoid !important; }',
  '[data-section] [class*="space-y"] > [data-pdf-entry] { break-inside: auto !important; }',
  '.resume-export span[class*="rounded-full"] { break-inside: avoid !important; }',
  'p { orphans: 3; widows: 3; }',
];

const HTML_REGRESSION_CASES: HtmlRegressionCase[] = [
  {
    fixtureName: 'modern-long-content',
    expectedLength: 57987,
    expectedSha256: '9d5f1b9a9c9ae227c5dbf3d6b30d1fd3d163efd747c23d023cef0e4b2b008bcd',
    dataAttributes: {
      'data-page-mode': 'edge-to-edge',
      'data-surface-mode': 'background',
      'data-column-mode': 'single',
      'data-outer-clone-mode': 'clone',
      'data-blank-page-prevention': 'light-shrink',
      'data-shrink-target': 'child-padding',
    },
    anchors: ['Modern Fit Marker Project'],
    snippets: [
      '--needs-padding: 0;',
      '--pdf-fragment-padding-floor: 8px;',
      '-webkit-box-decoration-break: clone;\n         box-decoration-break: clone;',
    ],
  },
  {
    fixtureName: 'sidebar-long-content',
    expectedLength: 65199,
    expectedSha256: '002aa5553a0df6172f000ca44308ef2b5559a369e3fe3c73c182e471eb67cb24',
    dataAttributes: {
      'data-page-mode': 'edge-to-edge',
      'data-surface-mode': 'sidebar-dark',
      'data-column-mode': 'split',
      'data-outer-clone-mode': 'slice',
      'data-blank-page-prevention': 'light-shrink',
      'data-shrink-target': 'child-padding',
    },
    anchors: ['Edge Rollout Program Marker'],
    snippets: [
      'background: linear-gradient(90deg, #1e40af 35%, white 35%) !important;',
      '.resume-export > div > div:first-child',
      '-webkit-box-decoration-break: slice !important;',
    ],
  },
  {
    fixtureName: 'compact-dense',
    expectedLength: 57912,
    expectedSha256: 'cff92d2ccc51a688170a357bfb806f1996b604057219938617a44fd8e5bdc8ea',
    dataAttributes: {
      'data-page-mode': 'edge-to-edge',
      'data-surface-mode': 'background',
      'data-column-mode': 'split',
      'data-outer-clone-mode': 'clone',
      'data-blank-page-prevention': 'aggressive-fit',
      'data-shrink-target': 'child-padding',
    },
    anchors: ['Compact Density Review Marker'],
    snippets: ['--needs-padding: 0;', 'data-blank-page-min-scale="92"'],
  },
  {
    fixtureName: 'neon-dark-background',
    expectedLength: 64442,
    expectedSha256: '47cf9f06ca0ac60838c761605746da804ec6a3041c16b8bffa57b173cb399bc2',
    dataAttributes: {
      'data-page-mode': 'edge-to-edge',
      'data-surface-mode': 'full-dark',
      'data-column-mode': 'single',
      'data-outer-clone-mode': 'clone',
      'data-blank-page-prevention': 'aggressive-fit',
      'data-shrink-target': 'child-padding',
    },
    anchors: ['Neon Dark Mode Portfolio', '多语言导出稳定性验证'],
    snippets: [
      'html, body { background: #111827 !important;',
      '.resume-export > div > *:last-child',
      'padding: 12mm 10mm !important;',
    ],
  },
  {
    fixtureName: 'swiss-page-gap',
    expectedLength: 64483,
    expectedSha256: '86d6422c325fe7b39f1720ac4077d616bdb462b81f044dcb739fcdfd31d6d81f',
    dataAttributes: {
      'data-page-mode': 'standard',
      'data-surface-mode': 'light',
      'data-column-mode': 'single',
      'data-outer-clone-mode': 'none',
      'data-blank-page-prevention': 'light-shrink',
      'data-shrink-target': 'outer-padding',
    },
    anchors: ['全栈工程师', '项目经历'],
    snippets: [
      'data-section-heading="wide"',
      'margin-left:calc(-1 * min(10px, var(--base-margin-left, 10px)));margin-right:calc(-1 * min(10px, var(--base-margin-right, 10px)));padding-left:min(10px, var(--base-margin-left, 10px));padding-right:min(10px, var(--base-margin-right, 10px))',
    ],
  },
  {
    fixtureName: 'gradient-page-margin',
    expectedLength: 66422,
    expectedSha256: '37f63510bdb80c9e8c83cbe537d9cf655e585c94b4aefdead7ae90cb832c6c82',
    dataAttributes: {
      'data-page-mode': 'edge-to-edge',
      'data-surface-mode': 'background',
      'data-column-mode': 'single',
      'data-outer-clone-mode': 'clone',
      'data-blank-page-prevention': 'light-shrink',
      'data-shrink-target': 'child-padding',
    },
    anchors: ['Gradient Page Safe Margin Marker', '后端 &amp; 数据中间件'],
    snippets: [
      'margin: 10mm 0 10mm 0;',
      '--pdf-page-margin-top: 38px;',
      '--pdf-page-margin-bottom: 38px;',
    ],
  },
];

function digestHtml(html: string): string {
  return createHash('sha256').update(html).digest('hex');
}

function assertHtmlIncludes(html: string, expected: string, message: string): void {
  expect(html.includes(expected)).toBeTruthy();
}

function asExportResume(resume: ReturnType<typeof getPdfRegressionFixture>): ResumeWithSections {
  return resume as unknown as ResumeWithSections;
}

test('PDF export HTML emits absolute font URLs when a font base URL is provided', async () => {
  const resume = getPdfRegressionFixture('modern-long-content');
  resume.themeConfig.fontFamily = CHINESE_RESUME_FONT_STACK;

  const html = await generatePdfHtml(asExportResume(resume), TEST_FONT_BASE_URL);

  expect(html).toMatch(new RegExp(`${TEST_FONT_BASE_URL}/fonts/custom/resource-han-rounded-cn/ResourceHanRoundedCN-Regular\\.ttf`),);
  expect(html).toMatch(/"Resource Han Rounded CN", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif/);
});

describe('PDF export HTML is deterministic for representative long-content templates', () => {
  for (const regressionCase of HTML_REGRESSION_CASES) {
    it(regressionCase.fixtureName, async () => {
      const resume = getPdfRegressionFixture(regressionCase.fixtureName);
      const beforeExport = structuredClone(resume);
      const html = await generatePdfHtml(asExportResume(resume), TEST_FONT_BASE_URL);
      const secondHtml = await generatePdfHtml(
        asExportResume(getPdfRegressionFixture(regressionCase.fixtureName)),
        TEST_FONT_BASE_URL,
      );

      expect(resume).toEqual(beforeExport);
      expect(secondHtml).toBe(html);
      expect(html.length).toBe(regressionCase.expectedLength);
      expect(digestHtml(html)).toBe(regressionCase.expectedSha256);

      for (const [attribute, value] of Object.entries(regressionCase.dataAttributes)) {
        assertHtmlIncludes(
          html,
          `${attribute}="${value}"`,
          `${regressionCase.fixtureName} should expose its PDF layout profile`,
        );
      }

      for (const anchor of regressionCase.anchors) {
        assertHtmlIncludes(html, anchor, `${regressionCase.fixtureName} should retain anchor content`);
      }

      for (const snippet of [...REQUIRED_PDF_PAGINATION_SNIPPETS, ...regressionCase.snippets]) {
        assertHtmlIncludes(
          html,
          snippet,
          `${regressionCase.fixtureName} should preserve export pagination CSS`,
        );
      }
    });
  }
});
