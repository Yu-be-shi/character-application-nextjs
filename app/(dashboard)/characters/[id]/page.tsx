import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { characterClient, CharacterApiError } from "@/lib/character-client";
import { prisma } from "@/lib/prisma";
import { assertOwnership, isOwner } from "@/lib/authz";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const t = await getTranslations("detail");
  const tg = await getTranslations("gender");

  const { id } = await params;

  let character;
  try {
    character = await characterClient.get(id);
  } catch (e) {
    // 404 のときだけ「見つかりません」。API ダウン等は誤魔化さず
    // エラーバウンダリ（error.tsx）に流す。
    if (e instanceof CharacterApiError && e.status === 404) notFound();
    throw e;
  }

  const owner = await isOwner(session.user.id, id);

  async function handleDelete() {
    "use server";
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // 削除対象はクライアント由来の値ではなく、表示中ページのルートパラメータ
    // （Server Action のクロージャ）を使う。所有者本人のみ削除できることも
    // UI でボタンを隠すだけでなくサーバー側で再確認する。
    await assertOwnership(session.user.id, id);

    // 先に所有紐付けを消し、その後 API を削除する。API 側の削除が失敗しても
    // reconcile（孤児キャラ掃除）が後で回収できる順序にする。
    // 消すのは自分のリンクだけ（スキーマ上は複数所有が可能なため、他ユーザーの
    // 所有権を巻き添えにしない）。最後の所有者だった場合のみ API 本体を削除する。
    await prisma.userCharacter.deleteMany({
      where: { userId: session.user.id, characterId: id },
    });
    const remaining = await prisma.userCharacter.count({ where: { characterId: id } });
    if (remaining === 0) {
      await characterClient.delete(id);
    }
    redirect("/characters");
  }

  return (
    <div style={{ maxWidth: "640px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/characters" style={{ fontSize: "13px", color: "#6c757d" }}>
          {t("back")}
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: 700 }}>{character.name}</h1>
        {owner && (
          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              href={`/characters/${id}/edit`}
              style={{
                padding: "7px 14px",
                border: "1px solid #ced4da",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#495057",
              }}
            >
              {t("edit")}
            </Link>
            <form action={handleDelete}>
              <button
                type="submit"
                style={{
                  padding: "7px 14px",
                  border: "1px solid #dc3545",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#dc3545",
                  background: "transparent",
                }}
              >
                {t("delete")}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* dt/dd は dl の子であるべき（dl 直下の div ラッパーは HTML 仕様で許容）。 */}
      <dl
        style={{
          background: "#fff",
          border: "1px solid #e9ecef",
          borderRadius: "8px",
          padding: "24px",
          display: "grid",
          gap: "16px",
          margin: 0,
        }}
      >
        <Row label={t("race")} value={character.race} />
        <Row label={t("gender")} value={tg(character.gender)} />
        {character.description && (
          <Row label={t("description")} value={character.description} multiline />
        )}
        <Row label={t("createdAt")} value={new Date(character.createdAt).toLocaleDateString()} />
      </dl>
    </div>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px" }}>
      <dt style={{ fontSize: "13px", color: "#6c757d", fontWeight: 500 }}>{label}</dt>
      <dd style={{ whiteSpace: multiline ? "pre-wrap" : undefined }}>{value}</dd>
    </div>
  );
}
