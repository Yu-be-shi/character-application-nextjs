# syntax=docker/dockerfile:1.7

# ── 依存インストール ──────────────────────────────────────────────────────────────
FROM node:26-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── ビルド ───────────────────────────────────────────────────────────────────────
FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── ランタイム ───────────────────────────────────────────────────────────────────
FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone ビルド成果物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma: スキーマとマイグレーションファイル
COPY --from=builder /app/prisma ./prisma

# Prisma: migrate deploy に必要なモジュール一式
# prisma CLI 6.x は @prisma/config を読み込み、それが effect / c12 などの
# トップレベル依存を要求する。@prisma・prisma だけを抜き出すと
# "Cannot find module 'effect'" で落ちるため、builder の node_modules を
# 丸ごとコピーして全依存を揃える。6.x が入っているので npx も 7.x を取りに行かない。
COPY --from=builder /app/node_modules ./node_modules

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
