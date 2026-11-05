import { backupSqliteDatabase } from '../src/lib/db/backup';

async function main() {
  const sourcePath = process.env.SQLITE_PATH || './data/jade.db';
  const backupDir = process.env.BACKUP_DIR || './data/backups';
  const keep = Number(process.env.BACKUP_KEEP || '14');

  if (process.env.DB_TYPE === 'postgresql' || (!process.env.DB_TYPE && process.env.DATABASE_URL)) {
    console.error(
      '[backup] This script only handles SQLite. Use pg_dump -Fc "$DATABASE_URL" for PostgreSQL.'
    );
    process.exit(1);
  }

  const result = await backupSqliteDatabase({ sourcePath, backupDir, keep });
  console.log(`[backup] wrote ${result.file} (${result.bytes} bytes)`);
  if (result.pruned.length > 0) {
    console.log(`[backup] pruned ${result.pruned.length} old backup(s): ${result.pruned.join(', ')}`);
  }
}

main().catch((error) => {
  console.error('[backup] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
