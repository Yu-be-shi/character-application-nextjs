import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { characterClient, type Character } from "@/lib/character-client";

// 宙吊りリンク（dangling link）の掃除（保険）。
//
// 作成は予約パターンの3段書き込み（作成(pending) → 所有リンク → 確定）。確定が最後なので
// 「可視なキャラは必ず所有者を持つ」(R1) は保たれ、未確定の余りは character-api 側の TTL が回収する。
// それでも稀に「リンクは作れたが確定前にプロセス断 → そのキャラが TTL 回収された」場合、
// 所有者だけが残る（宙吊りリンク）。このエンドポイントは consumer 自身のデータ（MySQL の
// UserCharacter）だけを掃除する:
//   宙吊りリンク … UserCharacter はあるが API 側に可視キャラが無い → リンクを削除
//
// ※ かつてあった「孤児キャラ（API にあるが所有者なし）を API から削除」は撤去した。
//   それは consumer が「自分の DB にリンクが無い＝消してよい」とみなして origin を削除する操作で、
//   複数 consumer 環境では他 consumer 所有のキャラを消しうる（R3 違反）。可視データの origin 削除は
//   所有者経由（assertOwnership 済みの削除）のみとし、未確定の回収は origin 側 TTL に一本化した。
//
// - 専用キー（RECONCILE_API_KEY）必須で保護。未設定ならエンドポイント無効（404）。
//   app↔API の共有鍵（CHARACTER_API_KEY）では認可しない＝破壊操作の露出面を分離する（最小権限）。
// - ?apply=1 を付けない限りドライラン（検知のみ・削除しない）
// - 作成直後/確定前のレースを避けるため、一定時間（既定1時間＝予約 TTL と整合）より古いものだけ対象
export const dynamic = "force-dynamic";

const DANGLING_MIN_AGE_MS = 60 * 60 * 1000; // 1 時間（character-api の予約 TTL と揃える）

/** API の一覧を limit/offset でページングしながら全件集める（API はデフォルト上限を持つ）。 */
const LIST_PAGE_SIZE = 500;

/** タイミング攻撃に耐性のある文字列比較。長さ不一致は即 false（長さは秘密ではない）。 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  // 破壊的（キャラ一括削除）エンドポイントなので専用キー必須。app↔API の共有鍵には
  // フォールバックしない（最小権限・露出面の分離）。未設定なら「存在しない」ものとして
  // 404 を返し、外部には何も晒さない（運用者にはサーバーログで気づかせる）。
  const expected = process.env.RECONCILE_API_KEY;
  if (!expected) {
    console.warn(
      "reconcile: RECONCILE_API_KEY が未設定のためエンドポイントを無効化（404）。有効化するには専用キーを設定してください。",
    );
    return NextResponse.json({ message: "not found" }, { status: 404 });
  }
  const key = req.headers.get("x-internal-api-key");
  if (!key || !safeEqual(key, expected)) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const apply = req.nextUrl.searchParams.get("apply") === "1";
  const cutoff = new Date(Date.now() - DANGLING_MIN_AGE_MS);

  const [all, links] = await Promise.all([
    listAllCharacters(),
    prisma.userCharacter.findMany({
      select: { id: true, characterId: true, createdAt: true },
    }),
  ]);
  const apiIds = new Set(all.map((c) => c.id));

  // 宙吊りリンク: 所有リンクはあるが API 側に可視キャラが無い（確定前に回収された等）/
  // 作成から一定時間経過。consumer 自身のデータ（MySQL のリンク）だけを掃除する。
  const dangling = links.filter((l) => !apiIds.has(l.characterId) && l.createdAt < cutoff);

  let deletedLinks = 0;
  if (apply && dangling.length > 0) {
    const res = await prisma.userCharacter.deleteMany({
      where: { id: { in: dangling.map((l) => l.id) } },
    });
    deletedLinks = res.count;
  }

  return NextResponse.json({
    scanned: all.length,
    danglingLinkCount: dangling.length,
    danglingCharacterIds: dangling.map((l) => l.characterId),
    applied: apply,
    deletedLinks,
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
