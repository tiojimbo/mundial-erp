#!/bin/sh
set -e

echo "Migrating ChannelType enum (old -> new values)..."
node prisma/fix-channel-type-enum.js

echo "Pushing Prisma schema to database..."
npx prisma db push --url "$DATABASE_URL" --accept-data-loss

echo "Seeding admin user..."
node dist/prisma/seed-admin.js || echo "Admin seed skipped (may already exist)"

echo "Starting application..."
exec node dist/src/main.js
