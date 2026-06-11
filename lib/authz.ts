// DB を直接触るサーバー専用モジュール（Client Component からの誤 import をビルド時に検知）。
import "server-only";
import { prisma } from "@/lib/prisma";

// キャラクターの所有権（ユーザー × キャラクターの紐付け）を判定する関数群。
//
// 所有権は MySQL 側の Prisma モデル UserCharacter のみが持つ（character-db / character-api は
// owner 概念を持たない）。編集・削除などの破壊的操作は、UI でボタンを隠すだけでなく、
// Server Action 内でここを再度呼び出してサーバー側でも検証すること（クライアント由来の ID を信用しない）。

/** ユーザーが指定キャラクターの所有者なら true。 */
export async function isOwner(userId: string, characterId: string): Promise<boolean> {
  const owned = await prisma.userCharacter.findUnique({
    where: { userId_characterId: { userId, characterId } },
  });
  return owned !== null;
}

/** 所有者でなければ "Forbidden" を投げる。Server Action の認可ガードに使う。 */
export async function assertOwnership(userId: string, characterId: string): Promise<void> {
  if (!(await isOwner(userId, characterId))) {
    throw new Error("Forbidden");
  }
}
