// 表示・入力で共有する定数。各ページに同じ定義を散らさず、ここに集約する。
// ※ 性別の表示ラベルは i18n（messages/*.json の gender.*）が持つ。ここには置かない。

/** character-db の gender_enum に対応する値の集合（唯一の正は character-db/schema.sql）。 */
export const GENDERS = ["male", "female", "other", "unknown"] as const;
export type Gender = (typeof GENDERS)[number];

/** ギャラリーの 1 ページあたり表示件数。 */
export const GALLERY_PAGE_SIZE = 24;
