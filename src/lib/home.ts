/**
 * Self-hosted resume users often want the dashboard as the first screen.
 * The marketing landing page remains the default.
 */
export function resolveDashboardHome(env: Record<string, string | undefined>): boolean {
  return env.JADE_HOME === 'dashboard';
}
