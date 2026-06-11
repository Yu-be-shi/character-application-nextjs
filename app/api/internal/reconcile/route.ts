import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { characterClient, type Character } from "@/lib/character-client";

// 孤児キャラクターのリコンサイル（保険）。
//
// キャラクター作成は「character-api で作成 → MySQL の UserCharacter に紐付け」の2段書き込み。
// 通常は作成 Server Action の補償処理で整合を保つが、プロセス断などで紐付けが漏れると
// 「API には存在するが所有者がいない」孤児キャラが残りうる。このエンドポイントは
// それを検知・削除する（cron などから定期実行する想定）。
//
// - 内部APIキー（X-Internal-API-Key）で保護
// - ?apply=1 を付けない限りドライラン（検知のみ・削除しない）
// - 作成直後のレースを避けるため、一定時間（既定1時間）より古い孤児のみ対象
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
  const expected = process.env.CHARACTER_API_KEY;
  if (!key || !expected || !safeEqual(key, expected)) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const apply = req.nextUrl.searchParams.get("apply") === "1";
  const cutoff = Date.now() - ORPHAN_MIN_AGE_MS;

  const [all, links] = await Promise.all([
    listAllCharacters(),
    prisma.userCharacter.findMany({ select: { characterId: true } }),
  ]);
  const owned = new Set(links.map((l) => l.characterId));

  const orphans = all.filter((c) => !owned.has(c.id) && new Date(c.createdAt).getTime() < cutoff);

  // 1 件の削除失敗で全体を止めず、失敗分はレスポンスに載せて次回実行に委ねる。
  let deleted = 0;
  const failed: string[] = [];
  if (apply) {
    for (const o of orphans) {
      try {
        await characterClient.delete(o.id);
        deleted++;
      } catch (e) {
        console.error("reconcile: orphan delete failed", o.id, e);
        failed.push(o.id);
      }
    }
  }

  return NextResponse.json({
    scanned: all.length,
    orphanCount: orphans.length,
    orphanIds: orphans.map((o) => o.id),
    applied: apply,
    deleted,
    failed,
  });
}

async function listAllCharacters(): Promise<Character[]> {
  const all: Character[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { items, total } = await characterClient.list({ limit: LIST_PAGE_SIZE, offset });
    all.push(...items);
    if (items.length === 0 || all.length >= total) return all;
  }
}
