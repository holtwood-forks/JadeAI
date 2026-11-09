import Database from 'better-sqlite3';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface BackupOptions {
  sourcePath: string;
  backupDir: string;
  keep?: number;
  now?: Date;
}

export interface BackupResult {
  file: string;
  pruned: string[];
  bytes: number;
}

const BACKUP_FILE_PATTERN = /^jade-\d{8}-\d{6}\.db$/;

export function formatBackupTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

async function verifyBackup(file: string): Promise<void> {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const result = db.pragma('integrity_check', { simple: true });
    if (result !== 'ok') {
      throw new Error(`Backup integrity check failed: ${String(result)}`);
    }
  } finally {
    db.close();
  }
}

export async function pruneBackups(backupDir: string, keep: number): Promise<string[]> {
  const entries = await readdir(backupDir);
  const files = entries.filter((name) => BACKUP_FILE_PATTERN.test(name)).sort();
  const remove = files.slice(0, Math.max(0, files.length - keep));
  await Promise.all(remove.map((name) => unlink(join(backupDir, name))));
  return remove;
}

/**
 * Creates a consistent SQLite snapshot using SQLite's online backup API.
 * Copying a live database file is unsafe under WAL mode; this is not.
 */
export async function backupSqliteDatabase(options: BackupOptions): Promise<BackupResult> {
  const keep = options.keep ?? 14;
  if (!Number.isInteger(keep) || keep < 1) {
    throw new Error('BACKUP_KEEP must be a positive integer.');
  }

  const sourcePath = resolve(options.sourcePath);
  const backupDir = resolve(options.backupDir);
  await mkdir(backupDir, { recursive: true });

  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  try {
    const file = join(backupDir, `jade-${formatBackupTimestamp(options.now ?? new Date())}.db`);
    await source.backup(file);
    await verifyBackup(file);
    const bytes = (await stat(file)).size;
    const pruned = await pruneBackups(backupDir, keep);
    return { file, pruned, bytes };
  } finally {
    source.close();
  }
}
