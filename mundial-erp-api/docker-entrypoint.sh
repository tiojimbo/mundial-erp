#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding admin user..."
node dist/prisma/seed-admin.js || echo "Admin seed skipped (may already exist)"

echo "Starting application..."
exec node dist/src/main.js
