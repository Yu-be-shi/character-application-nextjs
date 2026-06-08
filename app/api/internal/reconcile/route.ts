import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { characterClient } from "@/lib/character-client";

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

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-internal-api-key");
  if (!key || key !== process.env.CHARACTER_API_KEY) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const apply = req.nextUrl.searchParams.get("apply") === "1";
  const cutoff = Date.now() - ORPHAN_MIN_AGE_MS;

  const [all, links] = await Promise.all([
    characterClient.list(),
    prisma.userCharacter.findMany({ select: { characterId: true } }),
  ]);
  const owned = new Set(links.map((l) => l.characterId));

  const orphans = all.filter(
    (c) => !owned.has(c.id) && new Date(c.createdAt).getTime() < cutoff,
  );

  let deleted = 0;
  if (apply) {
    for (const o of orphans) {
      await characterClient.delete(o.id);
      deleted++;
    }
  }

  return NextResponse.json({
    scanned: all.length,
    orphanCount: orphans.length,
    orphanIds: orphans.map((o) => o.id),
    applied: apply,
    deleted,
  });
}
