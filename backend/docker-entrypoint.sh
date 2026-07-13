#!/bin/sh
set -e
echo "Running migrations..."
npx prisma migrate deploy
echo "Seeding database..."
npx ts-node prisma/seed.ts || true
echo "Starting PNMA API..."
node dist/src/main.js
