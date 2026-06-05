// Repo1（character-api）へのサーバーサイド専用 HTTP クライアント。
// この変数はブラウザに漏れてはならない（NEXT_PUBLIC_ プレフィックスなし）。

const CHARACTER_API_URL = process.env.CHARACTER_API_URL;
const CHARACTER_API_KEY = process.env.CHARACTER_API_KEY;

if (!CHARACTER_API_URL || !CHARACTER_API_KEY) {
  throw new Error("CHARACTER_API_URL / CHARACTER_API_KEY が未設定です");
}

const internalHeaders = {
  "Content-Type": "application/json",
  "X-Internal-API-Key": CHARACTER_API_KEY,
} as const;

export type CharacterAttributes = Record<string, unknown>;

export type Character = {
  id: string;
  name: string;
  attributes: CharacterAttributes;
  createdAt: string;
  updatedAt: string;
};

export type CreateCharacterInput = {
  name: string;
  attributes?: CharacterAttributes;
};

export type UpdateCharacterInput = {
  name?: string;
  attributes?: CharacterAttributes;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CHARACTER_API_URL}${path}`, {
    ...init,
    headers: { ...internalHeaders, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`character-api ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const characterClient = {
  list: () => request<Character[]>("/api/v1/characters"),

  get: (id: string) => request<Character>(`/api/v1/characters/${id}`),

  create: (input: CreateCharacterInput) =>
    request<Character>("/api/v1/characters", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateCharacterInput) =>
    request<Character>(`/api/v1/characters/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    request<void>(`/api/v1/characters/${id}`, { method: "DELETE" }),
};
