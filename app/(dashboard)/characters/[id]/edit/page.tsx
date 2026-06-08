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

    const birthDateStr = formData.get("birthDate") as string;
    const heightCmStr = formData.get("heightCm") as string;
    const weightKgStr = formData.get("weightKg") as string;
    const bodyFatPercentageStr = formData.get("bodyFatPercentage") as string;
    const sizeTopStr = formData.get("sizeTop") as string;
    const sizeMiddleStr = formData.get("sizeMiddle") as string;
    const sizeBottomStr = formData.get("sizeBottom") as string;

    await characterClient.update(id, {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      raceId: formData.get("raceId") as string,
      gender: formData.get("gender") as string,
      birthDate: birthDateStr ? `${birthDateStr}T00:00:00Z` : undefined,
      birthPlace: (formData.get("birthPlace") as string) || undefined,
      heightCm: heightCmStr ? Number(heightCmStr) : undefined,
      weightKg: weightKgStr ? Number(weightKgStr) : undefined,
      bodyFatPercentage: bodyFatPercentageStr ? Number(bodyFatPercentageStr) : undefined,
      sizeTop: sizeTopStr ? Number(sizeTopStr) : undefined,
      sizeMiddle: sizeMiddleStr ? Number(sizeMiddleStr) : undefined,
      sizeBottom: sizeBottomStr ? Number(sizeBottomStr) : undefined,
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
          <label htmlFor="birthDate">生年月日</label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={character.birthDate ? character.birthDate.slice(0, 10) : ""}
          />
        </div>

        <div>
          <label htmlFor="birthPlace">出身地</label>
          <input
            id="birthPlace"
            name="birthPlace"
            maxLength={150}
            placeholder="出身地"
            defaultValue={character.birthPlace ?? ""}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="heightCm">身長 (cm)</label>
            <input
              id="heightCm"
              name="heightCm"
              type="number"
              min={1}
              step={1}
              placeholder="例: 170"
              defaultValue={character.heightCm ?? ""}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="weightKg">体重 (kg)</label>
            <input
              id="weightKg"
              name="weightKg"
              type="number"
              min={1}
              step={1}
              placeholder="例: 60"
              defaultValue={character.weightKg ?? ""}
            />
          </div>
        </div>

        <div>
          <label htmlFor="bodyFatPercentage">体脂肪率 (%)</label>
          <input
            id="bodyFatPercentage"
            name="bodyFatPercentage"
            type="number"
            min={0}
            max={100}
            step={0.1}
            placeholder="例: 15.0"
            defaultValue={character.bodyFatPercentage ?? ""}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="sizeTop">サイズ上 (cm)</label>
            <input
              id="sizeTop"
              name="sizeTop"
              type="number"
              min={1}
              step={1}
              placeholder="例: 90"
              defaultValue={character.sizeTop ?? ""}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="sizeMiddle">サイズ中 (cm)</label>
            <input
              id="sizeMiddle"
              name="sizeMiddle"
              type="number"
              min={1}
              step={1}
              placeholder="例: 60"
              defaultValue={character.sizeMiddle ?? ""}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="sizeBottom">サイズ下 (cm)</label>
            <input
              id="sizeBottom"
              name="sizeBottom"
              type="number"
              min={1}
              step={1}
              placeholder="例: 88"
              defaultValue={character.sizeBottom ?? ""}
            />
          </div>
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
