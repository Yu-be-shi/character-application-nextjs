import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { characterClient, raceClient, CharacterApiError } from "./character-client";

// fetch をモックして HTTP クライアントの「仕様の核」を検証する:
// 認証ヘッダー・If-Match の引用形式・Idempotency-Key・空 ids の短絡・エラー変換・204。

const okJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("CHARACTER_API_URL", "http://character-api:8080");
  vi.stubEnv("CHARACTER_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("characterClient", () => {
  it("全リクエストに X-Internal-API-Key を付与する", async () => {
    fetchMock.mockResolvedValue(okJson({ items: [], total: 0 }));
    await characterClient.list();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://character-api:8080/api/v1/characters");
    expect(init.headers["X-Internal-API-Key"]).toBe("test-key");
  });

  it("ids が空配列なら API を呼ばず空を返す", async () => {
    const result = await characterClient.list({ ids: [] });
    expect(result).toEqual({ items: [], total: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ids / limit / offset をクエリ文字列にする", async () => {
    fetchMock.mockResolvedValue(okJson({ items: [], total: 0 }));
    await characterClient.list({ ids: ["a", "b"], limit: 10, offset: 20 });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("http://character-api:8080/api/v1/characters?ids=a%2Cb&limit=10&offset=20");
  });

  it("create は idempotencyKey を Idempotency-Key ヘッダーで送る", async () => {
    fetchMock.mockResolvedValue(okJson({ id: "x" }, 201));
    await characterClient.create({ name: "n", raceId: "r", gender: "unknown" }, "key-123");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Idempotency-Key"]).toBe("key-123");
  });

  it("update は expectedVersion を引用付き If-Match で送る", async () => {
    fetchMock.mockResolvedValue(okJson({ id: "x" }));
    await characterClient.update("x", { name: "n", raceId: "r", gender: "unknown" }, 3);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(init.headers["If-Match"]).toBe('"3"');
  });

  it("update は expectedVersion 省略時に If-Match を送らない", async () => {
    fetchMock.mockResolvedValue(okJson({ id: "x" }));
    await characterClient.update("x", { name: "n", raceId: "r", gender: "unknown" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["If-Match"]).toBeUndefined();
  });

  it("非 2xx は status と body を保持した CharacterApiError になる", async () => {
    fetchMock.mockResolvedValue(new Response("conflict", { status: 412 }));
    const err = await characterClient
      .update("x", { name: "n", raceId: "r", gender: "unknown" }, 1)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CharacterApiError);
    expect((err as CharacterApiError).status).toBe(412);
    expect((err as CharacterApiError).body).toBe("conflict");
  });

  it("delete は 204 を undefined として処理する", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(characterClient.delete("x")).resolves.toBeUndefined();
  });

  it("CHARACTER_API_URL 未設定なら fetch 前に失敗する", async () => {
    vi.stubEnv("CHARACTER_API_URL", "");
    await expect(characterClient.get("x")).rejects.toThrow(/未設定/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("raceClient", () => {
  it("races は revalidate キャッシュを使う（no-store にしない）", async () => {
    fetchMock.mockResolvedValue(okJson([]));
    await raceClient.list();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.cache).toBeUndefined();
    expect(init.next).toEqual({ revalidate: 3600 });
  });
});
