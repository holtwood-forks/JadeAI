#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

pnpm lint
pnpm type-check
pnpm test
pnpm build

SQLITE_SMOKE_DIR="$(mktemp -d)"
# Portable cleanup: some sandboxes reject `rm -rf` even on a mktemp dir.
trap 'find "$SQLITE_SMOKE_DIR" -depth -delete 2>/dev/null || true' EXIT

SQLITE_PATH="$SQLITE_SMOKE_DIR/jade.db" node --import tsx - <<'NODE'
const sqliteModule = await import('./src/lib/db/adapters/sqlite.ts');
const { SQLiteAdapter } = sqliteModule.default ?? sqliteModule;
const adapter = new SQLiteAdapter(process.env.SQLITE_PATH);
await adapter.initialize();
await adapter.close();
NODE

if [ -n "${DATABASE_URL:-}" ]; then
  node --import tsx - <<'NODE'
const postgresModule = await import('./src/lib/db/adapters/postgresql.ts');
const { PostgreSQLAdapter } = postgresModule.default ?? postgresModule;
const adapter = new PostgreSQLAdapter(process.env.DATABASE_URL);
await adapter.initialize();
await adapter.close();
NODE
else
  echo "Skipping PostgreSQL migration smoke test because DATABASE_URL is not set."
fi
