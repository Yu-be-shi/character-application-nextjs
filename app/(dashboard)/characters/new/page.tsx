import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { raceClient, characterClient } from "@/lib/character-client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function NewCharacterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const races = await raceClient.list();

  async function createCharacter(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const character = await characterClient.create({
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      raceId: formData.get("raceId") as string,
      gender: formData.get("gender") as string,
    });

    await prisma.userCharacter.create({
      data: {
        userId: session.user.id,
        characterId: character.id,
      },
    });

    redirect("/characters");
  }

  return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/characters" style={{ fontSize: "13px", color: "#6c757d" }}>
          ← マイキャラクターに戻る
        </Link>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>
          新規キャラクター作成
        </h1>
      </div>

      <form action={createCharacter} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label htmlFor="name">名前 *</label>
          <input id="name" name="name" required maxLength={100} placeholder="キャラクター名" />
        </div>

        <div>
          <label htmlFor="raceId">種族 *</label>
          <select id="raceId" name="raceId" required>
            <option value="">選択してください</option>
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gender">性別 *</label>
          <select id="gender" name="gender" required defaultValue="unknown">
            <option value="unknown">不明</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div>
          <label htmlFor="description">説明</label>
          <textarea id="description" name="description" rows={5} placeholder="キャラクターの説明..." />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
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
            作成する
          </button>
          <Link
            href="/characters"
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
