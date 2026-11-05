import { describe, expect, it } from 'vitest';
import { rejectsSqliteOnVercel, resolveDatabaseKind } from './database-kind';

const BUILD = { NEXT_PHASE: 'phase-production-build' };
const DESKTOP = { JADE_RUNTIME: 'desktop' };
const SINGLE_USER = { JADE_SINGLE_USER: 'true' };

describe('resolveDatabaseKind', () => {
  it('defaults to sqlite', () => {
    expect(resolveDatabaseKind({})).toBe('sqlite');
  });

  it('honours DB_TYPE for a web deployment', () => {
    expect(resolveDatabaseKind({ DB_TYPE: 'postgresql' })).toBe('postgresql');
    expect(resolveDatabaseKind({ DB_TYPE: 'sqlite' })).toBe('sqlite');
    expect(resolveDatabaseKind({ DB_TYPE: ' PostgreSQL ' })).toBe('postgresql');
  });

  it('uses PostgreSQL when DATABASE_URL is set without DB_TYPE', () => {
    expect(resolveDatabaseKind({ DATABASE_URL: 'postgres://user:pass@db/jade' }))
      .toBe('postgresql');
  });

  it('treats an unrecognised DB_TYPE as sqlite rather than failing to start', () => {
    expect(resolveDatabaseKind({ DB_TYPE: 'mysql' })).toBe('sqlite');
    expect(resolveDatabaseKind({ DB_TYPE: '' })).toBe('sqlite');
  });

  // The desktop client's whole promise is that data stays on the machine. A
  // stray DB_TYPE in the inherited environment must not send resumes to a
  // server.
  it('refuses postgresql on the desktop even when DB_TYPE asks for it', () => {
    expect(resolveDatabaseKind({ ...DESKTOP, DB_TYPE: 'postgresql' })).toBe('sqlite');
  });

  it('keeps an explicit PostgreSQL choice in single-user mode', () => {
    expect(resolveDatabaseKind({ ...SINGLE_USER, DB_TYPE: 'postgresql' })).toBe('postgresql');
  });

  // `next build` imports every route module, which constructs the adapter. On
  // PostgreSQL that would open a connection to — and migrate — whatever
  // DATABASE_URL points at, which may well be production.
  it('never selects postgresql during a production build', () => {
    expect(resolveDatabaseKind({ ...BUILD, DB_TYPE: 'postgresql' })).toBe('sqlite');
  });
});

describe('rejectsSqliteOnVercel', () => {
  it('rejects sqlite at runtime on Vercel, where the filesystem is read-only', () => {
    expect(rejectsSqliteOnVercel({ VERCEL: '1' })).toBe(true);
  });

  it('still rejects sqlite on Vercel in single-user mode', () => {
    expect(rejectsSqliteOnVercel({ ...SINGLE_USER, VERCEL: '1' })).toBe(true);
  });

  it('allows a Vercel deployment that uses postgresql', () => {
    expect(rejectsSqliteOnVercel({ VERCEL: '1', DB_TYPE: 'postgresql' })).toBe(false);
  });

  // The guard is about runtime. Builds deliberately use a throwaway SQLite file
  // even for PostgreSQL deployments, so applying it here would fail every
  // Vercel build of a perfectly correct PostgreSQL app.
  it('does not fire during a build, even for a postgresql deployment', () => {
    expect(rejectsSqliteOnVercel({ ...BUILD, VERCEL: '1', DB_TYPE: 'postgresql' })).toBe(false);
    expect(rejectsSqliteOnVercel({ ...BUILD, VERCEL: '1' })).toBe(false);
  });

  it('does not fire off Vercel', () => {
    expect(rejectsSqliteOnVercel({})).toBe(false);
  });
});
