import { describe, expect, it } from 'vitest';
import { MAX_SHARE_LABEL_LENGTH, MAX_SHARE_PASSWORD_LENGTH, readShareLabel, readSharePassword } from './payload';

describe('readSharePassword', () => {
  it('treats empty values as no password', () => {
    expect(readSharePassword(undefined)).toBeNull();
    expect(readSharePassword(null)).toBeNull();
    expect(readSharePassword('')).toBeNull();
  });

  it('accepts a password within the limit', () => {
    expect(readSharePassword('hunter2')).toBe('hunter2');
  });

  it('rejects non-strings and oversized values', () => {
    expect(() => readSharePassword(123)).toThrow(/password/);
    expect(() => readSharePassword('x'.repeat(MAX_SHARE_PASSWORD_LENGTH + 1))).toThrow(/password/);
  });
});

describe('readShareLabel', () => {
  it('defaults missing labels to an empty string', () => {
    expect(readShareLabel(undefined)).toBe('');
  });

  it('rejects a label that is too long', () => {
    expect(() => readShareLabel('x'.repeat(MAX_SHARE_LABEL_LENGTH + 1))).toThrow(/label/);
  });
});
