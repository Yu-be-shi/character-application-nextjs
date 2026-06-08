// character-api へのサーバーサイド専用 HTTP クライアント。
// この変数はブラウザに漏れてはならない（NEXT_PUBLIC_ プレフィックスなし）。

export type Character = {
  id: string;
  name: string;
  description: string;
  raceId: string;
  race: string;
  gender: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  birthPlace?: string;
  heightCm?: number;
  weightKg?: number;
  bodyFatPercentage?: number;
  sizeTop?: number;
  sizeMiddle?: number;
  sizeBottom?: number;
  createdAt: string;
  updatedAt: string;
};

export type Race = {
  id: string;
  name: string;
};

export type CreateCharacterInput = {
  name: string;
  description?: string;
  raceId: string;
  gender: string;
  birthDate?: string;
  birthPlace?: string;
  heightCm?: number;
  weightKg?: number;
  bodyFatPercentage?: number;
  sizeTop?: number;
  sizeMiddle?: number;
  sizeBottom?: number;
};

export type UpdateCharacterInput = Partial<CreateCharacterInput>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = process.env.CHARACTER_API_URL;
  const key = process.env.CHARACTER_API_KEY;
  if (!url || !key) throw new Error("CHARACTER_API_URL / CHARACTER_API_KEY が未設定です");

  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-API-Key": key,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`character-api ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
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

export const raceClient = {
  list: () => request<Race[]>("/api/v1/races"),
};
