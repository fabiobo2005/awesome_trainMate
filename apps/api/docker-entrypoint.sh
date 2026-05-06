#!/bin/sh
set -eu

cd /workspace/apps/api

echo "[entrypoint] Running prisma migrate deploy..."
node ../../node_modules/prisma/build/index.js migrate deploy

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "[entrypoint] RUN_DB_SEED=true — running seed script..."
  if ! node ../../node_modules/tsx/dist/cli.mjs prisma/seed.ts; then
    echo "[entrypoint] WARN: seed script failed; continuing API startup anyway." >&2
  fi
else
  echo "[entrypoint] RUN_DB_SEED!=true — skipping seed."
fi

echo "[entrypoint] Starting API..."
exec node dist/index.js
