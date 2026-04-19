#!/bin/sh
# Bootstrap the database schema + optionally seed on first deploy.
#
# Schema:
# - If migrations exist (apps/api/prisma/migrations/ has content):
#     run `prisma migrate deploy` — replays committed migrations in order.
# - If no migrations exist (fresh project, no Docker locally):
#     run `prisma db push` — pushes schema.prisma directly.
#
# Seed:
# - Always calls the seed script. The script itself is idempotent — it bails
#   out if the users table already has rows, so re-running on every deploy is
#   safe and cheap (one COUNT query).
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

echo "→ Checking if seed is needed (idempotent — skips if users exist)"
npx tsx prisma/seed.ts || echo "⚠️  Seed failed but continuing startup"
