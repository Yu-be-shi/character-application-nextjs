# user-dashboard

[![CI](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/ci.yml/badge.svg)](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/ci.yml)
[![E2E](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/e2e.yml/badge.svg)](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/e2e.yml)
[![CodeQL](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/codeql.yml/badge.svg)](https://github.com/Yu-be-shi/character-application-nextjs/actions/workflows/codeql.yml)

ユーザー向けWeb管理画面 + 認証APIのモノリス。
キャラクターデータの操作は `character-api`（Go）への HTTP リクエスト経由で行う。

## 技術スタック

| 層              | 技術                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------- |
| フレームワーク  | Next.js 15（App Router）                                                                    |
| 認証            | NextAuth.js v5（Auth.js, Google OAuth, DB セッション）                                      |
| ORM             | Prisma                                                                                      |
| ユーザーDB      | MySQL（`ys-infrastructure` ではなくこのリポジトリの compose が起動）                        |
| キャラクターAPI | `character-api`（Go）へ HTTP リクエスト                                                     |
| 入力検証        | zod（`lib/character-form.ts`）                                                              |
| テスト          | vitest（`lib/`・`components/` の単体/コンポーネント）+ Playwright E2E（`npm run test:e2e`） |

## アーキテクチャ上の重要ルール

- キャラクターデータの永続化は **直接 DB に書かない**。必ず `lib/character-client.ts` を通して
  `character-api` を呼び出す。
- `CHARACTER_API_KEY` はサーバーサイドでのみ使用し、ブラウザに漏らさない（`NEXT_PUBLIC_` を付けない）。
  シークレットを扱う `lib/character-client.ts`・`lib/auth.ts`・`lib/prisma.ts`・`lib/authz.ts` は
  `server-only` を import しており、Client Component から誤って import するとビルドが失敗する。
- **認可はサーバー側でも検証する**。編集・削除の Server Action は、UI でボタンを隠すだけでなく
  `lib/authz.ts` の `isOwner` / `assertOwnership` を呼び、`UserCharacter`（所有関係）を再確認してから
  `character-api` を呼ぶ（クライアント由来の ID を信用しない）。`middleware.ts` の cookie チェックは
  未ログインを早期に弾く楽観的な1層目にすぎず、認可の代わりにはならない。
- フォーム入力は `lib/character-form.ts` の zod スキーマで検証してから送信する。新規作成・編集の
  フォーム UI は `components/character-form.tsx` に共通化（検証エラーは `useActionState` で表示）。
- 新規作成は「API 作成 → `UserCharacter` 紐付け」の2段書き込み。後段が失敗したら作成済みキャラを
  削除して整合を保つ（補償処理）。ただし紐付けのユニーク制約違反（P2002）は「冪等再生で既に
  リンク済み」を意味するため成功として扱う（補償削除すると正規キャラを壊す）。
- 削除は「自分の `UserCharacter` を消す → 残り所有者が 0 なら API 本体を削除」の順
  （複数所有を許すスキーマで他ユーザーの所有権を巻き添えにしない）。
- **並行制御・冪等性**（`lib/character-client.ts`）：編集（PUT）は表示時に読んだ `version` を
  `If-Match` で送る楽観ロック。API が 412 を返したら「他で更新された」旨を表示する。新規作成は
  フォームが生成した `Idempotency-Key`（`components/character-form.tsx` の hidden field）を送り、
  二重送信を API 側で重複排除する。

## 内部メンテナンスエンドポイント

`POST /api/internal/reconcile` — 2段書き込みのズレを掃除する保険（cron などから定期実行する想定）。

- 検知・掃除する不整合は2方向: **孤児キャラ**（API に存在・所有リンクなし → API から削除）と
  **宙吊りリンク**（リンクあり・API 側キャラ消滅 → リンク削除）。
- `X-Internal-API-Key` ヘッダーで保護（`RECONCILE_API_KEY`。未設定時は `CHARACTER_API_KEY` に
  フォールバック）。`?apply=1` を付けない限りドライラン。作成から1時間未満のものは対象外。

```bash
curl -X POST -H "X-Internal-API-Key: $RECONCILE_API_KEY" \
  "http://localhost:3000/api/internal/reconcile"          # ドライラン
curl -X POST -H "X-Internal-API-Key: $RECONCILE_API_KEY" \
  "http://localhost:3000/api/internal/reconcile?apply=1"  # 実削除
```

## 起動方法

推奨はルート（character-system）の手順に従い `docker compose up --build` で MySQL + Next.js を
起動する方法（`docker-entrypoint.sh` が起動時に `prisma migrate deploy` を実行）。前提として
`ys-infrastructure` の基盤スタック（PostgreSQL + migrate + Go API）を先に起動し、`character-db-net`
経由で `character-api` に到達できること。

```bash
cp .env.example .env   # AUTH_GOOGLE_* などを記入
docker compose up --build
```

compose を使わず `npm run dev` で動かす場合は、`.env` に compose が注入している変数
（`DATABASE_URL` / `CHARACTER_API_URL` / `CHARACTER_API_KEY`）も自分で書く必要がある
（`.env.example` のコメント参照）。

```bash
npm install
npm run dev

# 品質チェック（CI と同じ）
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .（Flat Config: eslint.config.mjs）
npm test            # vitest run
npm run test:e2e    # Playwright（全スタック起動が前提）

# Prisma マイグレーション（ローカル DB が起動している前提）
npx prisma migrate dev
```

ポート公開は compose ファイルで環境別に分けている: base（`docker-compose.yml`）は非公開、
ローカル開発は `docker-compose.override.yml`（自動ロード。3000 とループバック限定の 3306）、
STG は `docker-compose.stg.yml`（3000 のみ）。

## character-api の型生成（OpenAPI → TypeScript）

`lib/character-client.ts` の型は `character-api`（Go）の OpenAPI 仕様から自動生成する。
Go の構造体を変えたら型を再生成し、ドリフトをコンパイル時に検出できるようにする。

```bash
# 1. Go の OpenAPI 仕様(swagger 2.0)を取り込み 3.0 へ変換して openapi/ にベンダリング
#    （隣接リポジトリ apis/ys-character-api の docs/swagger.yaml を参照。Go 側で swag init 済みのこと）
npm run sync:api-spec
# 2. 3.0 仕様から型を生成（ビルド/CI はこの生成物だけ使うのでサーバー起動不要）
npm run generate:types
```

- 生成物 `openapi/character-api.openapi.json` と `lib/api-types.gen.ts` はコミットする
  （消費側がツールチェーン無しでビルドできるように）。
- `openapi-typescript` は swagger 2.0 を受け付けないため、`swagger2openapi` で 3.0 へ変換する一段を挟む。
- 生成型は swaggo(2.0) 由来でレスポンス全項目が optional・`gender` が `string` になる。
  `character-client.ts` 側で「必ず返る項目の必須化」と「`gender` の列挙化」を薄い refinement 層で補正している。

## 環境変数

| 変数名               | 説明                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | MySQL DSN（Prisma が使用。compose 利用時は compose が注入）                             |
| `AUTH_SECRET`        | NextAuth セッション暗号化キー                                                           |
| `AUTH_GOOGLE_ID`     | Google OAuth クライアントID                                                             |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット                                                   |
| `AUTH_TRUST_HOST`    | ローカル docker（NODE_ENV=production）で Auth.js の UntrustedHost を回避するため `true` |
| `CHARACTER_API_URL`  | character-api の URL（例: `http://character-api:8080`。compose が注入）                 |
| `CHARACTER_API_KEY`  | character-api へのサービス間認証キー（API 側 `INTERNAL_API_KEY` と同じ値）              |
| `RECONCILE_API_KEY`  | `/api/internal/reconcile` の専用キー（未設定時は `CHARACTER_API_KEY` にフォールバック） |
| `NEXTAUTH_URL`       | 公開URL（例: `http://localhost:3000`）                                                  |
