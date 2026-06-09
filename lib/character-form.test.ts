import { describe, it, expect } from "vitest";
import { parseCharacterForm } from "@/lib/character-form";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const RACE_ID = "11111111-1111-1111-1111-111111111111";

describe("parseCharacterForm", () => {
  it("最小限の必須項目で成功する", () => {
    const r = parseCharacterForm(fd({ name: "アリス", raceId: RACE_ID, gender: "female" }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("アリス");
      expect(r.data.raceId).toBe(RACE_ID);
      expect(r.data.gender).toBe("female");
      // 任意項目は undefined（空文字を送らない）
      expect(r.data.birthDate).toBeUndefined();
      expect(r.data.heightCm).toBeUndefined();
    }
  });

  it("名前をトリムし、空白のみは必須エラー", () => {
    const ok = parseCharacterForm(fd({ name: "  ボブ  ", raceId: RACE_ID, gender: "male" }));
    expect(ok.success && ok.data.name).toBe("ボブ");

    const ng = parseCharacterForm(fd({ name: "   ", raceId: RACE_ID, gender: "male" }));
    expect(ng.success).toBe(false);
    if (!ng.success) expect(ng.fieldErrors.name).toBeTruthy();
  });

  it("生年月日を UTC 0時の ISO8601 に変換する", () => {
    const r = parseCharacterForm(
      fd({ name: "A", raceId: RACE_ID, gender: "other", birthDate: "1990-05-20" }),
    );
    expect(r.success && r.data.birthDate).toBe("1990-05-20T00:00:00Z");
  });

  it("数値文字列を数値に変換する", () => {
    const r = parseCharacterForm(
      fd({ name: "A", raceId: RACE_ID, gender: "male", heightCm: "170", weightKg: "60" }),
    );
    expect(r.success && r.data.heightCm).toBe(170);
    expect(r.success && r.data.weightKg).toBe(60);
  });

  it("体脂肪率は 0..100 の範囲外を拒否する", () => {
    const ng = parseCharacterForm(
      fd({ name: "A", raceId: RACE_ID, gender: "male", bodyFatPercentage: "150" }),
    );
    expect(ng.success).toBe(false);
    if (!ng.success) expect(ng.fieldErrors.bodyFatPercentage).toBeTruthy();
  });

  it("身体測定値は正の整数のみ許可する", () => {
    const ng = parseCharacterForm(
      fd({ name: "A", raceId: RACE_ID, gender: "male", heightCm: "0" }),
    );
    expect(ng.success).toBe(false);
    if (!ng.success) expect(ng.fieldErrors.heightCm).toBeTruthy();
  });

  it("不正な gender を拒否する", () => {
    const ng = parseCharacterForm(fd({ name: "A", raceId: RACE_ID, gender: "alien" }));
    expect(ng.success).toBe(false);
    if (!ng.success) expect(ng.fieldErrors.gender).toBeTruthy();
  });

  it("raceId が UUID でなければ拒否する", () => {
    const ng = parseCharacterForm(fd({ name: "A", raceId: "not-uuid", gender: "male" }));
    expect(ng.success).toBe(false);
    if (!ng.success) expect(ng.fieldErrors.raceId).toBeTruthy();
  });
});
