import { resolveSingleUserMode } from './runtime-mode';

const singleUser = resolveSingleUserMode(process.env);

export const config = {
  auth: {
    enabled: process.env.AUTH_ENABLED === 'true',
    providers: ['google'] as const,
  },
  runtime: {
    /** True when every request maps to the fixed `local` user. */
    singleUser,
    /** @deprecated Use `singleUser`; kept for the Electron-era name. */
    desktop: singleUser,
  },
  db: {
    /**
     * Web deployments may run on PostgreSQL. The desktop client never does —
     * see resolveDatabaseKind, which ignores this entirely rather than trusting
     * an environment it does not control.
     */
    type: (process.env.DB_TYPE || 'sqlite') as 'postgresql' | 'sqlite',
  },
  i18n: {
    defaultLocale: 'zh' as const,
    locales: ['zh', 'en'] as const,
  },
};
