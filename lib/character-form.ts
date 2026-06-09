import { z } from "zod";
import { GENDERS } from "@/lib/constants";
import type { CreateCharacterInput } from "@/lib/character-client";

// キャラクターフォーム（新規作成・編集で共通）の入力検証とパース。
//
// 以前は new/edit の Server Action に同じ FormData パース・日付変換・数値変換が重複していた。
// ここに一元化し、zod で型・範囲を検証する。検証は UI（input の min/max 等）だけに頼らず、
// サーバー側（Server Action）でも必ず通すこと。

/** smallint の上限。character-db の身体測定値は SMALLINT（CHECK > 0）で定義されている。 */
const SMALLINT_MAX = 32767;

const optionalTrimmed = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z.string().max(max, `${label}は${max}文字以内で入力してください`).optional(),
  );

const optionalPositiveInt = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : typeof v === "string" ? Number(v) : v),
    z
      .number({ invalid_type_error: `${label}は数値で入力してください` })
      .int(`${label}は整数で入力してください`)
      .positive(`${label}は1以上で入力してください`)
      .max(SMALLINT_MAX, `${label}が大きすぎます`)
      .optional(),
  );

export const characterFormSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, "名前は必須です").max(100, "名前は100文字以内で入力してください"),
  ),
  description: optionalTrimmed(2000, "説明"),
  raceId: z.preprocess(
    (v) => (typeof v === "string" ? v : ""),
    z.string().uuid("種族を選択してください"),
  ),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: "性別を選択してください" }) }),
  birthDate: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日の形式が不正です")
      .optional(),
  ),
  birthPlace: optionalTrimmed(150, "出身地"),
  heightCm: optionalPositiveInt("身長"),
  weightKg: optionalPositiveInt("体重"),
  bodyFatPercentage: z.preprocess(
    (v) => (v === "" || v == null ? undefined : typeof v === "string" ? Number(v) : v),
    z
      .number({ invalid_type_error: "体脂肪率は数値で入力してください" })
      .min(0, "体脂肪率は0以上で入力してください")
      .max(100, "体脂肪率は100以下で入力してください")
      .optional(),
  ),
  sizeTop: optionalPositiveInt("サイズ上"),
  sizeMiddle: optionalPositiveInt("サイズ中"),
  sizeBottom: optionalPositiveInt("サイズ下"),
});

export type CharacterFormValues = z.infer<typeof characterFormSchema>;

export type ParseResult =
  | { success: true; data: CreateCharacterInput }
  | { success: false; fieldErrors: Record<string, string> };

/**
 * FormData を検証し、character-api に渡せる CreateCharacterInput へ変換する。
 * 失敗時は最初に出たフィールドごとのエラーメッセージを返す。
 */
export function parseCharacterForm(formData: FormData): ParseResult {
  const raw = {
    name: formData.get("name"),
    description: formData.get("description"),
    raceId: formData.get("raceId"),
    gender: formData.get("gender"),
    birthDate: formData.get("birthDate"),
    birthPlace: formData.get("birthPlace"),
    heightCm: formData.get("heightCm"),
    weightKg: formData.get("weightKg"),
    bodyFatPercentage: formData.get("bodyFatPercentage"),
    sizeTop: formData.get("sizeTop"),
    sizeMiddle: formData.get("sizeMiddle"),
    sizeBottom: formData.get("sizeBottom"),
  };

  const parsed = characterFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  const v = parsed.data;
  return {
    success: true,
    data: {
      name: v.name,
      description: v.description,
      raceId: v.raceId,
      gender: v.gender,
      // input[type=date] の "YYYY-MM-DD" を UTC 0時の ISO8601 に変換する。
      birthDate: v.birthDate ? `${v.birthDate}T00:00:00Z` : undefined,
      birthPlace: v.birthPlace,
      heightCm: v.heightCm,
      weightKg: v.weightKg,
      bodyFatPercentage: v.bodyFatPercentage,
      sizeTop: v.sizeTop,
      sizeMiddle: v.sizeMiddle,
      sizeBottom: v.sizeBottom,
    },
  };
}
