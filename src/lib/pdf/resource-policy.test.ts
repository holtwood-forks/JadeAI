import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_CONCURRENT_RESUME_PDFS,
  DEFAULT_PDF_BROWSER_IDLE_MS,
  resolveMaxConcurrentResumePdfs,
  resolvePdfBrowserIdleMs,
} from './resource-policy';

describe('resolveMaxConcurrentResumePdfs', () => {
  it('defaults to 2', () => {
    expect(resolveMaxConcurrentResumePdfs({})).toBe(DEFAULT_MAX_CONCURRENT_RESUME_PDFS);
  });

  it('accepts an explicit lower bound', () => {
    expect(resolveMaxConcurrentResumePdfs({ PDF_MAX_CONCURRENT: '1' })).toBe(1);
  });

  it('ignores invalid values and clamps the upper bound', () => {
    expect(resolveMaxConcurrentResumePdfs({ PDF_MAX_CONCURRENT: '0' })).toBe(2);
    expect(resolveMaxConcurrentResumePdfs({ PDF_MAX_CONCURRENT: 'abc' })).toBe(2);
    expect(resolveMaxConcurrentResumePdfs({ PDF_MAX_CONCURRENT: '9' })).toBe(4);
  });
});

describe('resolvePdfBrowserIdleMs', () => {
  it('defaults to 10 minutes', () => {
    expect(resolvePdfBrowserIdleMs({})).toBe(DEFAULT_PDF_BROWSER_IDLE_MS);
  });

  it('honours a shorter idle window and clamps extremes', () => {
    expect(resolvePdfBrowserIdleMs({ PDF_BROWSER_IDLE_MS: '120000' })).toBe(120_000);
    expect(resolvePdfBrowserIdleMs({ PDF_BROWSER_IDLE_MS: '1' })).toBe(10_000);
    expect(resolvePdfBrowserIdleMs({ PDF_BROWSER_IDLE_MS: String(10 * 60 * 60 * 1000) })).toBe(60 * 60 * 1000);
  });
});
