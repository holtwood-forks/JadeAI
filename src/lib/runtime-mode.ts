/**
 * Single-user mode keeps every request on the fixed `local` user.
 *
 * `JADE_RUNTIME=desktop` is the historical switch from the Electron client;
 * `JADE_SINGLE_USER=true` is the clearer Web/self-hosted alias. Both mean the
 * same thing, so existing deployments keep working.
 */
export function resolveSingleUserMode(env: Record<string, string | undefined>): boolean {
  return env.JADE_SINGLE_USER === 'true' || env.JADE_RUNTIME === 'desktop';
}
