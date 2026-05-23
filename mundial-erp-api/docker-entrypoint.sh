#!/bin/sh
set -e

echo "Migrating ChannelType enum (old -> new values)..."
node prisma/fix-channel-type-enum.js

echo "Pushing Prisma schema to database..."
npx prisma db push --url "$DATABASE_URL" --accept-data-loss

echo "Seeding admin user..."
npx tsx prisma/seed-admin.ts || echo "Admin seed skipped (may already exist)"

echo "Backfilling CNPJ autofill fields per workspace..."
npx tsx prisma/seed-cnpj-autofill.ts || echo "CNPJ autofill backfill skipped"

echo "Starting application..."
exec node dist/src/main.js
