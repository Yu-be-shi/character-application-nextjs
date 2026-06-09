# user-dashboard

[![CI](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/ci.yml/badge.svg)](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/ci.yml)
[![E2E](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/e2e.yml/badge.svg)](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/e2e.yml)
[![CodeQL](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/codeql.yml/badge.svg)](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/codeql.yml)

ユーザー向けWeb管理画面 + 認証APIのモノリス。
キャラクターデータの操作は Repo1（character-api）への HTTP リクエスト経由で行う。

## 技術スタック

| 層              | 技術                                                                  |
| --------------- | --------------------------------------------------------------------- |
| フレームワーク  | Next.js 15（App Router）                                              |
| 認証            | NextAuth.js v5（Auth.js, Google OAuth）                               |
| ORM             | Prisma                                                                |
| ユーザーDB      | MySQL（`character-db-infra` ではなくこのリポジトリの compose が起動） |
| キャラクターAPI | `character-api`（Go）へ HTTP リクエスト                               |
| 入力検証        | zod（`lib/character-form.ts`）                                        |
| テスト          | vitest（`lib/*.test.ts`）                                             |

## アーキテクチャ上の重要ルール

- キャラクターデータの永続化は **直接 DB に書かない**。必ず `lib/character-client.ts` を通して
  `character-api` を呼び出す。
- `CHARACTER_API_KEY` はサーバーサイドでのみ使用し、ブラウザに漏らさない（`NEXT_PUBLIC_` を付けない）。
- **認可はサーバー側でも検証する**。編集・削除の Server Action は、UI でボタンを隠すだけでなく
  `lib/authz.ts` の `isOwner` / `assertOwnership` を呼び、`UserCharacter`（所有関係）を再確認してから
  `character-api` を呼ぶ（クライアント由来の ID を信用しない）。
- フォーム入力は `lib/character-form.ts` の zod スキーマで検証してから送信する。新規作成・編集の
  フォーム UI は `components/character-form.tsx` に共通化（検証エラーは `useActionState` で表示）。
- 新規作成は「API 作成 → `UserCharacter` 紐付け」の2段書き込み。後段が失敗したら作成済みキャラを
  削除して整合を保つ（補償処理。削除も失敗した場合はログに残す）。
- **並行制御・冪等性**（`lib/character-client.ts`）：編集（PUT）は表示時に読んだ `version` を
  `If-Match` で送る楽観ロック。API が 412 を返したら「他で更新された」旨を表示する。新規作成は
  フォームが生成した `Idempotency-Key`（`components/character-form.tsx` の hidden field）を送り、
  二重送信を API 側で重複排除する。

## 起動方法

```bash
# 依存インストール
npm install

# 環境変数の準備
cp .env.example .env

# 開発サーバー
npm run dev

# 品質チェック（CI と同じ）
npm run typecheck   # tsc --noEmit
npm run lint        # next lint（.eslintrc.json: next/core-web-vitals + next/typescript）
npm test            # vitest run

# Prisma マイグレーション（ローカル DB が起動している前提）
npx prisma migrate dev
```

> 推奨はルートの手順に従い `docker compose up --build` で MySQL + Next.js を起動する方法
> （`docker-entrypoint.sh` が起動時に `prisma migrate deploy` を実行）。前提として
> `character-db-infra` → `character-api-go-infra` を先に起動し、`character-db-net` 経由で
> `character-api` に到達できること。

## 環境変数

| 変数名               | 説明                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`       | MySQL DSN（Prisma が使用）                                         |
| `AUTH_SECRET`        | NextAuth セッション暗号化キー                                      |
| `AUTH_GOOGLE_ID`     | Google OAuth クライアントID                                        |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット                              |
| `CHARACTER_API_URL`  | Repo1 の URL（例: `http://character-api:8080`）                    |
| `CHARACTER_API_KEY`  | Repo1 へのサービス間認証キー（Repo4 の INTERNAL_API_KEY と同じ値） |
| `NEXTAUTH_URL`       | 公開URL（例: `http://localhost:3000`）                             |
