import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getShareUrl } from './share';

function request(headers: Record<string, string> = {}, url = 'http://internal:3000/api/resume/1/share') {
  return new NextRequest(url, { headers });
}

describe('getShareUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ignores attacker-controlled forwarded headers by default', () => {
    vi.stubEnv('PUBLIC_SITE_URL', 'https://jade.example');
    vi.stubEnv('TRUST_PROXY', '');
    const url = getShareUrl('abc123', request({
      'x-forwarded-host': 'attacker.example',
      'x-forwarded-proto': 'http',
    }));
    expect(url).toBe('https://jade.example/share/abc123');
  });

  it('falls back to the request origin when PUBLIC_SITE_URL is unset', () => {
    vi.stubEnv('PUBLIC_SITE_URL', '');
    vi.stubEnv('TRUST_PROXY', '');
    expect(getShareUrl('abc123', request())).toBe('http://internal:3000/share/abc123');
  });

  it('keeps a path prefix from PUBLIC_SITE_URL', () => {
    vi.stubEnv('PUBLIC_SITE_URL', 'https://holtwood-forks.github.io/JadeAI/');
    vi.stubEnv('TRUST_PROXY', '');
    expect(getShareUrl('abc123', request())).toBe(
      'https://holtwood-forks.github.io/JadeAI/share/abc123',
    );
  });

  it('uses forwarded headers only when TRUST_PROXY is enabled', () => {
    vi.stubEnv('PUBLIC_SITE_URL', 'https://jade.example');
    vi.stubEnv('TRUST_PROXY', 'true');
    const url = getShareUrl('abc123', request({
      'x-forwarded-host': 'cv.example',
      'x-forwarded-proto': 'https',
    }));
    expect(url).toBe('https://cv.example/share/abc123');
  });

  it('rejects a forwarded host that smuggles a path', () => {
    vi.stubEnv('PUBLIC_SITE_URL', 'https://jade.example');
    vi.stubEnv('TRUST_PROXY', 'true');
    const url = getShareUrl('abc123', request({
      'x-forwarded-host': 'evil.example/phish',
      'x-forwarded-proto': 'https',
    }));
    expect(url).toBe('https://jade.example/share/abc123');
  });

  it('encodes the token', () => {
    vi.stubEnv('PUBLIC_SITE_URL', 'https://jade.example');
    vi.stubEnv('TRUST_PROXY', '');
    expect(getShareUrl('../x', request())).toBe('https://jade.example/share/..%2Fx');
  });
});
