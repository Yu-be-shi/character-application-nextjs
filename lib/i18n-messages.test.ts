import { describe, it, expect } from "vitest";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

// メッセージカタログのキー集合が全ロケールで一致することを保証する
// （翻訳漏れ＝片方だけにキーがある状態を CI で検知する）。
function flatKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("i18n message catalogs", () => {
  it("ja と en のキー集合が一致する（翻訳漏れが無い）", () => {
    const jaKeys = flatKeys(ja).sort();
    const enKeys = flatKeys(en).sort();
    expect(enKeys).toEqual(jaKeys);
  });
});
