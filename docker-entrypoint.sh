#!/bin/sh
set -e

echo "Prisma マイグレーション実行中..."
node node_modules/prisma/build/index.js migrate deploy

echo "Next.js サーバー起動..."
exec node server.js
