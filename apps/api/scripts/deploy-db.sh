#!/bin/sh
# Bootstrap the database schema on Railway deploy.
#
# - If migrations exist (apps/api/prisma/migrations/ has content):
#     run `prisma migrate deploy` — replays committed migrations in order.
#     This is the right path once the team has a schema evolution workflow.
#
# - If no migrations exist (fresh project, no Docker locally):
#     run `prisma db push` — pushes schema.prisma directly.
#     Good for first deploys and MVP. Switch to migrations later.
#
# Run from apps/api directory.
set -e

if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null | grep -v migration_lock.toml || true)" ]; then
  echo "→ Applying committed migrations via 'prisma migrate deploy'"
  npx prisma migrate deploy
else
  echo "→ No migrations found; syncing schema via 'prisma db push'"
  npx prisma db push
fi
