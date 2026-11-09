import { describe, expect, it } from 'vitest';
import { resolveRecruitEnabled } from './features';

describe('resolveRecruitEnabled', () => {
  it('is enabled by default', () => {
    expect(resolveRecruitEnabled({})).toBe(true);
  });

  it('is disabled only by the explicit false value', () => {
    expect(resolveRecruitEnabled({ FEATURE_RECRUIT: 'false' })).toBe(false);
    expect(resolveRecruitEnabled({ FEATURE_RECRUIT: 'true' })).toBe(true);
    expect(resolveRecruitEnabled({ FEATURE_RECRUIT: '0' })).toBe(true);
  });
});
