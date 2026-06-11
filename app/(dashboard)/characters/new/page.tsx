import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { raceClient, characterClient } from "@/lib/character-client";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseCharacterForm } from "@/lib/character-form";
import { CharacterForm, type CharacterFormState } from "@/components/character-form";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NewCharacterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const races = await raceClient.list();
  const t = await getTranslations("form");
  const td = await getTranslations("detail");

  async function createCharacter(
    _prev: CharacterFormState,
    formData: FormData,
  ): Promise<CharacterFormState> {
    "use server";
    const tf = await getTranslations("form");
    const session = await auth();
    if (!session?.user?.id) return { error: tf("errLogin") };

    const parsed = parseCharacterForm(formData);
    if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

    // 冪等キー（二重送信を API 側で重複排除）。通常はフォームが生成して hidden で送るが、
    // ハイドレーション前の送信や no-JS でキーが空のことがある。その場合でも HTTP 層での
    // 重複排除を保証するため、サーバー側で必ずトークンを補う（DB の creation_token 一意
    // 制約は最終防壁だが、空トークン送信に依存しない）。
    const idempotencyKey =
      (formData.get("idempotencyKey") as string)?.trim() || crypto.randomUUID();

    // 予約パターンの 3 段書き込み: ①作成(pending・不可視) → ②所有リンク → ③確定(active・可視)。
    // 確定を最後に置くことで「可視なキャラは必ず所有者を持つ」(R1) を保証する。失敗しても
    // 未確定のまま残るだけで、可視データに穴は空かず、未確定は API 側の TTL が回収する
    // （消費者が origin を削除しない＝R3 を守る。補償削除は不要）。
    let character;
    try {
      character = await characterClient.create(parsed.data, idempotencyKey);
    } catch (e) {
      console.error("character create failed", e);
      return { error: tf("errCreate") };
    }

    // ② 所有リンク（再送で既にリンク済み＝P2002 は握り潰して③へ進む。
    //    create は同一 Idempotency-Key で同じ id を返すため再送安全）。
    try {
      await prisma.userCharacter.create({
        data: { userId: session.user.id, characterId: character.id },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
        // リンク失敗。キャラは未確定のままなので可視化されず、TTL で回収される。
        console.error(
          "userCharacter link failed; character stays unconfirmed (reclaimed by TTL)",
          character.id,
          e,
        );
        return { error: tf("errSave") };
      }
      // P2002 = 既にリンク済み（再送）。確定（③）へ進む。
    }

    // ③ 確定して可視化（冪等）。失敗しても未確定のまま TTL 回収に委ねる。
    try {
      await characterClient.confirm(character.id);
    } catch (e) {
      console.error(
        "character confirm failed; stays unconfirmed (reclaimed by TTL)",
        character.id,
        e,
      );
      return { error: tf("errSave") };
    }

    // 確定済み（可視）になったので一覧・ギャラリーのキャッシュを無効化してから遷移する
    // （Router Cache が古い一覧を出さないように）。
    revalidatePath("/characters");
    revalidatePath("/gallery");
    redirect("/characters");
  }

  return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/characters" style={{ fontSize: "13px", color: "#6c757d" }}>
          {td("back")}
        </Link>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>{t("newTitle")}</h1>
      </div>

      <CharacterForm
        action={createCharacter}
        races={races}
        mode="create"
        cancelHref="/characters"
        withIdempotencyKey
      />
    </div>
  );
}
