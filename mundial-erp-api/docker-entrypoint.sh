#!/bin/sh
set -e

echo "Pushing Prisma schema to database..."
npx prisma db push --accept-data-loss

echo "Seeding admin user..."
node dist/prisma/seed-admin.js || echo "Admin seed skipped (may already exist)"

echo "Starting application..."
exec node dist/src/main.js
