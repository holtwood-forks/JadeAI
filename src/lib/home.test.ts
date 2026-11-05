import { describe, expect, it } from 'vitest';
import { resolveDashboardHome } from './home';

describe('resolveDashboardHome', () => {
  it('keeps the landing page by default', () => {
    expect(resolveDashboardHome({})).toBe(false);
    expect(resolveDashboardHome({ JADE_HOME: 'landing' })).toBe(false);
  });

  it('sends the root to the dashboard when requested', () => {
    expect(resolveDashboardHome({ JADE_HOME: 'dashboard' })).toBe(true);
  });
});
