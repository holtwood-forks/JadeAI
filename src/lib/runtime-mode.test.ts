import { describe, expect, it } from 'vitest';
import { resolveSingleUserMode } from './runtime-mode';

describe('resolveSingleUserMode', () => {
  it('defaults to multi-user', () => {
    expect(resolveSingleUserMode({})).toBe(false);
  });

  it('accepts the explicit Web alias', () => {
    expect(resolveSingleUserMode({ JADE_SINGLE_USER: 'true' })).toBe(true);
  });

  it('keeps the historical desktop switch working', () => {
    expect(resolveSingleUserMode({ JADE_RUNTIME: 'desktop' })).toBe(true);
  });

  it('does not enable on other values', () => {
    expect(resolveSingleUserMode({ JADE_SINGLE_USER: '1' })).toBe(false);
    expect(resolveSingleUserMode({ JADE_SINGLE_USER: 'TRUE' })).toBe(false);
    expect(resolveSingleUserMode({ JADE_RUNTIME: 'web' })).toBe(false);
  });

  it('accepts either switch when both are set', () => {
    expect(resolveSingleUserMode({ JADE_SINGLE_USER: 'true', JADE_RUNTIME: 'desktop' })).toBe(true);
  });
});
