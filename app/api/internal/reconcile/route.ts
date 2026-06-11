import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { characterClient, type Character } from "@/lib/character-client";

// キャラクターと所有リンクのリコンサイル（保険）。
//
// キャラクター作成は「character-api で作成 → MySQL の UserCharacter に紐付け」の2段書き込み。
// 通常は作成 Server Action の補償処理で整合を保つが、プロセス断などでズレると
// 2方向の不整合が残りうる。このエンドポイントは両方向を検知・掃除する:
//   1. 孤児キャラ   … API には存在するが所有者（UserCharacter）がいない → API から削除
//   2. 宙吊りリンク … UserCharacter はあるが API 側キャラが消滅している → リンクを削除
//
// - 専用キー（RECONCILE_API_KEY。未設定時は CHARACTER_API_KEY にフォールバック）で保護
// - ?apply=1 を付けない限りドライラン（検知のみ・削除しない）
// - 作成直後のレースを避けるため、一定時間（既定1時間）より古いものだけ対象
//
// ※ 所有権は application（MySQL/UserCharacter）が握るため、この処理は character-api 側ではなく
//   ここで行う（依存方向と所有権境界を保つ）。
export const dynamic = "force-dynamic";

const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000; // 1 時間

/** API の一覧を limit/offset でページングしながら全件集める（API はデフォルト上限を持つ）。 */
const LIST_PAGE_SIZE = 500;

/** タイミング攻撃に耐性のある文字列比較。長さ不一致は即 false（長さは秘密ではない）。 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-internal-api-key");
  // app→API 用シークレットの流用を避け、専用キーを優先する（信頼ドメインの分離）。
  const expected = process.env.RECONCILE_API_KEY || process.env.CHARACTER_API_KEY;
  if (!key || !expected || !safeEqual(key, expected)) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const apply = req.nextUrl.searchParams.get("apply") === "1";
  const cutoff = new Date(Date.now() - ORPHAN_MIN_AGE_MS);

  const [all, links] = await Promise.all([
    listAllCharacters(),
    prisma.userCharacter.findMany({
      select: { id: true, characterId: true, createdAt: true },
    }),
  ]);
  const apiIds = new Set(all.map((c) => c.id));
  const owned = new Set(links.map((l) => l.characterId));

  // 1. 孤児キャラ: API に存在 / 所有リンクなし / 作成から一定時間経過。
  const orphans = all.filter((c) => !owned.has(c.id) && new Date(c.createdAt) < cutoff);

  // 2. 宙吊りリンク: 所有リンクあり / API 側キャラ消滅（論理削除済み含む）/ 作成から一定時間経過。
  const dangling = links.filter((l) => !apiIds.has(l.characterId) && l.createdAt < cutoff);

  // 1 件の削除失敗で全体を止めず、失敗分はレスポンスに載せて次回実行に委ねる。
  let deletedOrphans = 0;
  let deletedLinks = 0;
  const failed: string[] = [];
  if (apply) {
    for (const o of orphans) {
      try {
        await characterClient.delete(o.id);
        deletedOrphans++;
      } catch (e) {
        console.error("reconcile: orphan delete failed", o.id, e);
        failed.push(o.id);
      }
    }
    if (dangling.length > 0) {
      const res = await prisma.userCharacter.deleteMany({
        where: { id: { in: dangling.map((l) => l.id) } },
      });
      deletedLinks = res.count;
    }
  }

  return NextResponse.json({
    scanned: all.length,
    orphanCount: orphans.length,
    orphanIds: orphans.map((o) => o.id),
    danglingLinkCount: dangling.length,
    danglingCharacterIds: dangling.map((l) => l.characterId),
    applied: apply,
    deleted: deletedOrphans,
    deletedLinks,
    failed,
  });
}

async function listAllCharacters(): Promise<Character[]> {
  const all: Character[] = [];
  for (let offset = 0; ; ) {
    const { items, total } = await characterClient.list({ limit: LIST_PAGE_SIZE, offset });
    all.push(...items);
    // API 側が limit をさらに小さく丸めても取りこぼさないよう、実際の取得件数で進める。
    offset += items.length;
    if (items.length === 0 || all.length >= total) return all;
  }
}
