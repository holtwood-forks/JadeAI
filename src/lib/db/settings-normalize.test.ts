import { describe, expect, it } from 'vitest';
import { normalizeUserSettings } from './settings-normalize';

describe('normalizeUserSettings', () => {
  it('returns an object unchanged', () => {
    expect(normalizeUserSettings({ aiModel: 'gpt-4o' })).toEqual({ aiModel: 'gpt-4o' });
  });

  it('parses a JSON string', () => {
    expect(normalizeUserSettings('{"aiModel":"gpt-4o"}')).toEqual({ aiModel: 'gpt-4o' });
  });

  it('unwraps the legacy double-encoded default', () => {
    expect(normalizeUserSettings('"{}"')).toEqual({});
  });

  it('drops character-index keys left by spreading a string', () => {
    expect(normalizeUserSettings('{"0":"{","1":"}","aiModel":"gpt-4o"}')).toEqual({
      aiModel: 'gpt-4o',
    });
  });

  it('keeps numeric-looking keys with real values', () => {
    expect(normalizeUserSettings({ 0: 'first' })).toEqual({ 0: 'first' });
  });

  it('falls back to an empty object for invalid values', () => {
    expect(normalizeUserSettings('{')).toEqual({});
    expect(normalizeUserSettings(null)).toEqual({});
    expect(normalizeUserSettings([1, 2])).toEqual({});
  });
});
