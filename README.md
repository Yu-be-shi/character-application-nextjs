# user-dashboard

ユーザー向けWeb管理画面 + 認証APIのモノリス。
キャラクターデータの操作は Repo1（character-api）への HTTP リクエスト経由で行う。

## 技術スタック

| 層 | 技術 |
|---|---|
| フレームワーク | Next.js 15（App Router） |
| 認証 | NextAuth.js v5（Auth.js） |
| ORM | Prisma |
| ユーザーDB | MySQL（Repo4 管理） |
| キャラクターAPI | character-api（Repo1）へ HTTP リクエスト |

## アーキテクチャ上の重要ルール

- キャラクターデータの永続化は **直接 DB に書かない**
- 必ず `lib/character-client.ts` を通して Repo1 の API を呼び出す
- `CHARACTER_API_KEY` はサーバーサイドでのみ使用し、ブラウザに漏らさない（`NEXT_PUBLIC_` プレフィックスを付けない）

## 起動方法

```bash
# 依存インストール
npm install

# 環境変数の準備
cp .env.example .env.local

# 開発サーバー
npm run dev

# Prisma マイグレーション（ローカル DB が起動している前提）
npx prisma migrate dev
```

## 環境変数

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | MySQL DSN（Prisma が使用） |
| `AUTH_SECRET` | NextAuth セッション暗号化キー |
| `AUTH_GOOGLE_ID` | Google OAuth クライアントID |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット |
| `CHARACTER_API_URL` | Repo1 の URL（例: `http://character-api:8080`） |
| `CHARACTER_API_KEY` | Repo1 へのサービス間認証キー（Repo4 の INTERNAL_API_KEY と同じ値） |
| `NEXTAUTH_URL` | 公開URL（例: `http://localhost:3000`） |
