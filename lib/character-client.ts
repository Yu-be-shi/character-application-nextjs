// character-api へのサーバーサイド専用 HTTP クライアント。
// この変数はブラウザに漏れてはならない（NEXT_PUBLIC_ プレフィックスなし）。

// 共有シークレット CHARACTER_API_KEY を扱うため、誤って Client Component から
// import されたらブラウザ実行時を待たずビルド時に失敗させる。
import "server-only";

import type { components } from "./api-types.gen";

// 型は character-api（Go）の OpenAPI 仕様から自動生成（lib/api-types.gen.ts）。
// 仕様の更新手順は package.json の sync:api-spec / generate:types を参照。
type Schemas = components["schemas"];

// 指定キーを必須化（NonNullable）するユーティリティ。
// K は keyof T に制約されるため、Go 側がフィールドを削除/改名すると型エラーで検知できる。
type Require<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};

// gender は Go の OpenAPI 上は string だが、実際は列挙。ここで絞り込む。
// 列挙の定義は lib/constants.ts に一本化（二重定義しない）。
import type { Gender } from "./constants";
export type { Gender };

// 生成型(swaggo 2.0 由来でレスポンス全項目が optional)を土台に、
// API が必ず返す項目を必須化し、gender を列挙へ絞る。
export type Character = Omit<
  Require<
    Schemas["dto.CharacterResponse"],
    | "id"
    | "name"
    | "description"
    | "raceId"
    | "race"
    | "gender"
    | "version" // 楽観ロック用。更新時に If-Match で送り返す
    | "createdAt"
    | "updatedAt"
  >,
  "gender"
> & { gender: Gender };

// character-api のエラー。HTTP ステータスを保持し、呼び出し側が 412/422 等を判別できるようにする。
export class CharacterApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`character-api ${status}: ${body}`);
    this.name = "CharacterApiError";
  }
}

export type Race = Require<Schemas["dto.RaceResponse"], "id" | "name">;

// リクエスト型は生成型をそのまま使う（required は OpenAPI が表現できている）。
export type CreateCharacterInput = Schemas["dto.CreateCharacterRequest"];

export type UpdateCharacterInput = Schemas["dto.UpdateCharacterRequest"];

async function request<T>(path: string, init?: RequestInit & { revalidate?: number }): Promise<T> {
  const url = process.env.CHARACTER_API_URL;
  const key = process.env.CHARACTER_API_KEY;
  if (!url || !key) throw new Error("CHARACTER_API_URL / CHARACTER_API_KEY が未設定です");

  const { revalidate, ...rest } = init ?? {};
  const res = await fetch(`${url}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-API-Key": key,
      ...(rest.headers ?? {}),
    },
    // 既定は no-store（キャラクターは常に最新を読む）。revalidate 指定時のみ
    // Next.js の Data Cache を許す（races などほぼ静的なマスタ用）。
    ...(revalidate != null ? { next: { revalidate } } : { cache: "no-store" as const }),
    // API ハング時に Server Component のレンダリングを無期限にブロックしない。
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new CharacterApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ListParams = { ids?: string[]; limit?: number; offset?: number };

// 一覧レスポンス。items（このページ分）と total（Limit/Offset を無視した総件数）。
export type CharacterList = { items: Character[]; total: number };

export const characterClient = {
  // ids 指定でバッチ取得（N+1 回避）/ limit・offset でページング。
  // ids が空配列なら API を呼ばず空を返す（所有0件で全件取得しないため）。
  list: (params?: ListParams): Promise<CharacterList> => {
    if (params?.ids && params.ids.length === 0) {
      return Promise.resolve<CharacterList>({ items: [], total: 0 });
    }
    const qs = new URLSearchParams();
    if (params?.ids?.length) qs.set("ids", params.ids.join(","));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<CharacterList>(`/api/v1/characters${q ? `?${q}` : ""}`);
  },
  get: (id: string) => request<Character>(`/api/v1/characters/${id}`),
  // 予約パターン: create は pending（不可視）として作成する。所有リンクを書いた後に
  // confirm で active（可視）へ昇格させる。idempotencyKey を渡すと二重送信が API 側で
  // 重複排除される（Redis のミドルウェアに加え、DB の creation_token 一意制約でも永続的に防止）。
  create: (input: CreateCharacterInput, idempotencyKey?: string) =>
    request<Character>("/api/v1/characters", {
      method: "POST",
      body: JSON.stringify(input),
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    }),
  // 予約の確定（pending → active）。冪等。所有リンク作成後に呼ぶ。
  confirm: (id: string) =>
    request<Character>(`/api/v1/characters/${id}/confirm`, { method: "POST" }),
  // PUT は全置換（省略した任意項目は API 側でクリアされる）ため、引数型は
  // 部分更新用の UpdateCharacterInput ではなく作成時と同じ完全な形を要求する。
  // expectedVersion を渡すと楽観ロック（If-Match）。版不一致は API が 412 を返す。
  update: (id: string, input: CreateCharacterInput, expectedVersion?: number) =>
    request<Character>(`/api/v1/characters/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
      headers: expectedVersion != null ? { "If-Match": `"${expectedVersion}"` } : undefined,
    }),
  delete: (id: string) => request<void>(`/api/v1/characters/${id}`, { method: "DELETE" }),
};

export const raceClient = {
  // 種族はほぼ静的なマスタなので 1 時間キャッシュする（フォーム表示のたびの fetch を避ける）。
  list: () => request<Race[]>("/api/v1/races", { revalidate: 3600 }),
};
