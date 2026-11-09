/**
 * Refuse to start with contradictory identity settings.
 *
 * This file is bundled for both the Node.js and Edge runtimes, so the Node-only
 * check (which exits the process) lives in a dynamically imported module. The
 * request path also fails closed, but a startup failure is far easier to notice
 * than 500s under load.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // `next build` imports this module but has no runtime identity to validate.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { assertAuthModeConfig } = await import('./lib/auth/mode-conflict-runtime');
  assertAuthModeConfig();
}
