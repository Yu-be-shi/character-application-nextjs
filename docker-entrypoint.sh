#!/bin/sh
set -e

echo "Prisma マイグレーション実行中..."
npx prisma migrate deploy

echo "Next.js サーバー起動..."
exec node server.js
