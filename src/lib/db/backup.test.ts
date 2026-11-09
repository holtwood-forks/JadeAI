import Database from 'better-sqlite3';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { backupSqliteDatabase, formatBackupTimestamp, pruneBackups } from './backup';

const dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'jade-backup-'));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('formatBackupTimestamp', () => {
  it('formats a local timestamp suitable for filenames', () => {
    expect(formatBackupTimestamp(new Date(2026, 0, 2, 3, 4, 5))).toBe('20260102-030405');
  });
});

describe('backupSqliteDatabase', () => {
  it('creates a verifiable snapshot that contains the source rows', async () => {
    const dir = await tempDir();
    const sourcePath = join(dir, 'jade.db');
    const backupDir = join(dir, 'backups');

    const source = new Database(sourcePath);
    source.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)');
    source.prepare('INSERT INTO notes (body) VALUES (?)').run('keep me');
    source.close();

    const result = await backupSqliteDatabase({
      sourcePath,
      backupDir,
      keep: 14,
      now: new Date(2026, 0, 2, 3, 4, 5),
    });

    expect(result.file.endsWith('jade-20260102-030405.db')).toBe(true);
    expect(result.bytes).toBeGreaterThan(0);

    const snapshot = new Database(result.file, { readonly: true });
    try {
      expect(snapshot.pragma('integrity_check', { simple: true })).toBe('ok');
      expect(snapshot.prepare('SELECT body FROM notes').pluck().get()).toBe('keep me');
    } finally {
      snapshot.close();
    }
  });

  it('prunes only old jade backups and keeps the requested count', async () => {
    const dir = await tempDir();
    const sourcePath = join(dir, 'jade.db');
    const backupDir = join(dir, 'backups');

    const source = new Database(sourcePath);
    source.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY)');
    source.close();

    for (const day of [1, 2, 3]) {
      await backupSqliteDatabase({
        sourcePath,
        backupDir,
        keep: 2,
        now: new Date(2026, 0, day, 0, 0, 0),
      });
    }

    const files = (await readdir(backupDir)).sort();
    expect(files).toEqual(['jade-20260102-000000.db', 'jade-20260103-000000.db']);
  });

  it('rejects a non-positive retention count', async () => {
    await expect(
      backupSqliteDatabase({ sourcePath: '/tmp/missing.db', backupDir: '/tmp', keep: 0 })
    ).rejects.toThrow(/positive integer/);
  });

  it('pruneBackups ignores unrelated files', async () => {
    const dir = await tempDir();
    await Promise.all([
      import('node:fs/promises').then(({ writeFile }) => writeFile(join(dir, 'jade-20260101-000000.db'), '')),
      import('node:fs/promises').then(({ writeFile }) => writeFile(join(dir, 'notes.txt'), '')),
    ]);
    await pruneBackups(dir, 0);
    expect((await readdir(dir)).sort()).toEqual(['notes.txt']);
  });
});
