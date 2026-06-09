// 表示・入力で共有する定数。各ページに同じ定義を散らさず、ここに集約する。

/** character-db の gender_enum に対応する値の集合（唯一の正は character-db/schema.sql）。 */
export const GENDERS = ["male", "female", "other", "unknown"] as const;
export type Gender = (typeof GENDERS)[number];

/** 性別コード → 日本語ラベル。一覧・詳細・ギャラリーで共通利用する。 */
export const GENDER_LABEL: Record<Gender, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  unknown: "不明",
};

/** フォームの性別セレクト用の選択肢（表示順）。 */
export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "unknown", label: GENDER_LABEL.unknown },
  { value: "male", label: GENDER_LABEL.male },
  { value: "female", label: GENDER_LABEL.female },
  { value: "other", label: GENDER_LABEL.other },
];

/** ギャラリーの 1 ページあたり表示件数。 */
export const GALLERY_PAGE_SIZE = 24;
