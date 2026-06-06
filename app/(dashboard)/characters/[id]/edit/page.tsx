import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { characterClient, raceClient } from "@/lib/character-client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const userChar = await prisma.userCharacter.findUnique({
    where: { userId_characterId: { userId: session.user.id, characterId: id } },
  });
  if (!userChar) notFound();

  let character;
  try {
    character = await characterClient.get(id);
  } catch {
    notFound();
  }

  const races = await raceClient.list();

  async function updateCharacter(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await characterClient.update(id, {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      raceId: formData.get("raceId") as string,
      gender: formData.get("gender") as string,
    });

    redirect(`/characters/${id}`);
  }

  return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href={`/characters/${id}`} style={{ fontSize: "13px", color: "#6c757d" }}>
          ← キャラクター詳細に戻る
        </Link>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>
          キャラクター編集
        </h1>
      </div>

      <form action={updateCharacter} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label htmlFor="name">名前 *</label>
          <input id="name" name="name" required maxLength={100} defaultValue={character.name} />
        </div>

        <div>
          <label htmlFor="raceId">種族 *</label>
          <select id="raceId" name="raceId" required defaultValue={character.raceId}>
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gender">性別 *</label>
          <select id="gender" name="gender" required defaultValue={character.gender}>
            <option value="unknown">不明</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div>
          <label htmlFor="description">説明</label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={character.description}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              background: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 500,
            }}
          >
            更新する
          </button>
          <Link
            href={`/characters/${id}`}
            style={{
              padding: "10px 20px",
              border: "1px solid #ced4da",
              borderRadius: "6px",
              color: "#495057",
            }}
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
