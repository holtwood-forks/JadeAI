import { AUTH_MODE_CONFLICT_MESSAGE, hasAuthModeConflict } from './mode-conflict';
import { resolveSingleUserMode } from '@/lib/runtime-mode';

/**
 * Node-only startup guard: a server that boots with contradictory identity
 * settings but answers 500 forever still looks "up" to most orchestrators.
 */
const PLACEHOLDER_SECRETS = new Set([
  'your-auth-secret-key-change-me',
  'changeme',
  'change-me',
  'secret',
]);

export function assertAuthModeConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (hasAuthModeConflict(env.AUTH_ENABLED === 'true', resolveSingleUserMode(env))) {
    console.error(AUTH_MODE_CONFLICT_MESSAGE);
    process.exit(1);
  }

  // Not fatal (the app can still boot), but both cases break session signing or
  // leave a guessable secret. /api/ready reports the missing case as a 503.
  const secret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn('[config] AUTH_SECRET is not set; /api/ready will report the instance as unready.');
  } else if (PLACEHOLDER_SECRETS.has(secret) || secret.length < 16) {
    console.warn(
      '[config] AUTH_SECRET looks like a placeholder or is shorter than 16 characters. ' +
        'Generate one with: openssl rand -base64 32',
    );
  }
}
