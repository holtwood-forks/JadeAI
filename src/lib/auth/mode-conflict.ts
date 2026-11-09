/**
 * `JADE_SINGLE_USER` / `JADE_RUNTIME=desktop` map every request to the fixed
 * `local` user, without consulting the session. That is incompatible with
 * `AUTH_ENABLED=true`: whichever branch runs first silently decides whether
 * OAuth is enforced. Treat the combination as a configuration error instead of
 * picking a winner.
 */
export const AUTH_MODE_CONFLICT_MESSAGE =
  'AUTH_ENABLED=true cannot be combined with JADE_SINGLE_USER=true (or JADE_RUNTIME=desktop): ' +
  'single-user mode maps every request to the local user and would bypass authentication. ' +
  'Unset one of them.';

export function hasAuthModeConflict(authEnabled: boolean, singleUser: boolean): boolean {
  return authEnabled && singleUser;
}
