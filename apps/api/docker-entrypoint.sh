#!/bin/sh
set -eu

cd /workspace/apps/api

echo "[entrypoint] Running prisma migrate deploy..."
node ../../node_modules/prisma/build/index.js migrate deploy

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "[entrypoint] RUN_DB_SEED=true — running seed script..."
  node ../../node_modules/tsx/dist/cli.mjs prisma/seed.ts
else
  echo "[entrypoint] RUN_DB_SEED!=true — skipping seed."
fi

echo "[entrypoint] Starting API..."
exec node dist/index.js
