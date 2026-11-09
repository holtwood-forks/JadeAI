import { db, dbReady } from '@/lib/db';
import { users } from '@/lib/db/schema';

/**
 * Readiness probe: reports whether this instance can actually serve requests.
 *
 * `/api/health` stays a pure liveness check (no DB), because a slow database
 * should not be reported as "the process is down". This endpoint is the one to
 * wire into container healthchecks: it verifies the DB connection and the
 * auth secret that NextAuth needs.
 */
export const dynamic = 'force-dynamic';

type CheckStatus = 'ok' | 'error' | 'missing';

export async function GET() {
  const checks: Record<string, CheckStatus> = {
    config: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET ? 'ok' : 'missing',
  };

  try {
    await dbReady;
    // Works on both SQLite (better-sqlite3) and PostgreSQL (postgres-js), and
    // also proves the migrations actually created the core table.
    await db.select({ id: users.id }).from(users).limit(1);
    checks.database = 'ok';
  } catch (error) {
    console.error('GET /api/ready database check failed:', error);
    checks.database = 'error';
  }

  const ok = Object.values(checks).every((status) => status === 'ok');
  return Response.json(
    { ok, checks },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
