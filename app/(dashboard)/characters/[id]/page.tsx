import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { characterClient } from "@/lib/character-client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const GENDER_LABEL: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  unknown: "不明",
};

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  let character;
  try {
    character = await characterClient.get(id);
  } catch {
    notFound();
  }

  const userChar = await prisma.userCharacter.findUnique({
    where: { userId_characterId: { userId: session.user.id, characterId: id } },
  });
  const isOwner = !!userChar;

  async function handleDelete(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const charId = formData.get("characterId") as string;

    // 所有者本人のみ削除できる（編集ページと同様に紐付けを再確認する）。
    // UI でボタンを隠すだけでなくサーバー側でも検証し、なりすまし削除を防ぐ。
    const owned = await prisma.userCharacter.findUnique({
      where: {
        userId_characterId: { userId: session.user.id, characterId: charId },
      },
    });
    if (!owned) throw new Error("Forbidden");

    await characterClient.delete(charId);
    await prisma.userCharacter.deleteMany({ where: { characterId: charId } });
    redirect("/characters");
  }

  return (
    <div style={{ maxWidth: "640px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/characters" style={{ fontSize: "13px", color: "#6c757d" }}>
          ← マイキャラクターに戻る
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
        {isOwner && (
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
              編集
            </Link>
            <form action={handleDelete}>
              <input type="hidden" name="characterId" value={id} />
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
                削除
              </button>
            </form>
          </div>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e9ecef",
          borderRadius: "8px",
          padding: "24px",
          display: "grid",
          gap: "16px",
        }}
      >
        <Row label="種族" value={character.race} />
        <Row label="性別" value={GENDER_LABEL[character.gender] ?? character.gender} />
        {character.description && (
          <Row label="説明" value={character.description} multiline />
        )}
        <Row
          label="作成日"
          value={new Date(character.createdAt).toLocaleDateString("ja-JP")}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px" }}>
      <dt style={{ fontSize: "13px", color: "#6c757d", fontWeight: 500 }}>{label}</dt>
      <dd style={{ whiteSpace: multiline ? "pre-wrap" : undefined }}>{value}</dd>
    </div>
  );
}
