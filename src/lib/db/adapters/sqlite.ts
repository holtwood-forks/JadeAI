import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../schema';
import { resolveMigrationsDir } from '../migrations-dir';
import type { DatabaseAdapter, TransactionCallback } from '../adapter';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from '../../config';

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const directCode = 'code' in error ? error.code : undefined;
  if (typeof directCode === 'string') return directCode;
  const cause = 'cause' in error ? error.cause : undefined;
  if (typeof cause !== 'object' || cause === null) return undefined;
  const causeCode = 'code' in cause ? cause.code : undefined;
  return typeof causeCode === 'string' ? causeCode : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.cause instanceof Error) return error.cause.message;
    return error.message;
  }
  return String(error);
}

function isConcurrentMigrationError(error: unknown): boolean {
  return getErrorCode(error) === 'SQLITE_ERROR' && getErrorMessage(error).includes('already exists');
}

/**
 * `already exists` is usually another process racing the same migration, but
 * it can also mean a migration ran on a half-applied schema. Only tolerate the
 * former: the migration ledger must have advanced to the newest journal entry,
 * which cannot happen when a transaction rolled back.
 */
function isMigrationLedgerCurrent(sqlite: Database.Database, migrationsDir: string): boolean {
  try {
    const journal = JSON.parse(
      readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf8')
    ) as { entries?: { when?: number }[] };
    const expected = journal.entries?.at(-1)?.when;
    if (typeof expected !== 'number') return false;
    const row = sqlite
      .prepare('SELECT MAX(created_at) AS applied FROM __drizzle_migrations')
      .get() as { applied: number | string | null } | undefined;
    return Number(row?.applied ?? NaN) >= expected;
  } catch {
    return false;
  }
}

function isConcurrentSeedError(error: unknown): boolean {
  return getErrorCode(error) === 'SQLITE_CONSTRAINT_UNIQUE' && getErrorMessage(error).includes('users.fingerprint');
}

export class SQLiteAdapter implements DatabaseAdapter {
  db;
  private sqlite: Database.Database;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.sqlite = new Database(path);
    this.sqlite.pragma('busy_timeout = 5000');
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('foreign_keys = ON');
    this.db = drizzle(this.sqlite, { schema });

    // Auto-run migrations (synchronous for SQLite)
    const migrationsDir = resolveMigrationsDir(process.env, process.cwd());
    try {
      migrate(this.db, { migrationsFolder: migrationsDir });
    } catch (e) {
      if (isConcurrentMigrationError(e) && isMigrationLedgerCurrent(this.sqlite, migrationsDir)) {
        // Another process finished the same migration batch first.
        return;
      }
      console.error('[DB] SQLite migration failed:', e);
      throw e;
    }
  }

  async initialize(): Promise<void> {
    // Desktop has exactly one user, created lazily by resolveUser() →
    // userRepository.ensureLocalUser(). Seeding a demo-fingerprint user here
    // would leave a second, unreachable user row in every install.
    if (config.runtime.singleUser) {
      return;
    }

    try {
      const row = this.sqlite.prepare('SELECT count(*) as count FROM users').get() as
        | { count: number }
        | undefined;
      if (row?.count === 0) {
        const { seedDemoUser } = await import('../seed-demo');
        await seedDemoUser(this.db);
        console.log('[DB] SQLite auto-seed complete');
      }
    } catch (e) {
      if (isConcurrentSeedError(e)) {
        return;
      }
      // Demo data is optional. initialize() only rejects on migration errors;
      // a transient seed failure (busy_timeout, disk pressure) must not turn
      // dbReady into a permanently rejected promise for the whole process.
      console.error('[DB] SQLite auto-seed failed (continuing without demo data):', e);
    }
  }

  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.db.transaction((tx) => {
      const result = callback(tx);

      if (result && typeof (result as Promise<T>).then === 'function') {
        throw new Error('SQLite transactions require synchronous callbacks');
      }

      return result as T;
    });
  }

  async close(): Promise<void> {
    this.sqlite.close();
  }
}
