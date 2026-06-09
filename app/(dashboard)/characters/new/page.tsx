import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { raceClient, characterClient } from "@/lib/character-client";
import { prisma } from "@/lib/prisma";
import { parseCharacterForm } from "@/lib/character-form";
import { CharacterForm, type CharacterFormState } from "@/components/character-form";
import Link from "next/link";

export default async function NewCharacterPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const races = await raceClient.list();

  async function createCharacter(
    _prev: CharacterFormState,
    formData: FormData,
  ): Promise<CharacterFormState> {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return { error: "ログインが必要です" };

    const parsed = parseCharacterForm(formData);
    if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

    let character;
    try {
      character = await characterClient.create(parsed.data);
    } catch (e) {
      console.error("character create failed", e);
      return { error: "キャラクターの作成に失敗しました。時間をおいて再度お試しください。" };
    }

    // API 作成と所有権紐付けは別ストアへの2段書き込み。後段が失敗したら、
    // 作成済みキャラクターを削除して整合を保つ（孤児キャラ防止の補償処理）。
    try {
      await prisma.userCharacter.create({
        data: { userId: session.user.id, characterId: character.id },
      });
    } catch (e) {
      console.error("userCharacter link failed; compensating delete", character.id, e);
      await characterClient.delete(character.id).catch((delErr) => {
        // 補償削除も失敗すると孤児キャラが残る。後で検知・掃除できるよう必ずログに残す。
        console.error("compensating delete failed; orphan may remain", character.id, delErr);
      });
      return { error: "キャラクターの保存に失敗しました。時間をおいて再度お試しください。" };
    }

    redirect("/characters");
  }

  return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href="/characters" style={{ fontSize: "13px", color: "#6c757d" }}>
          ← マイキャラクターに戻る
        </Link>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>
          キャラクター新規作成
        </h1>
      </div>

      <CharacterForm
        action={createCharacter}
        races={races}
        submitLabel="作成する"
        cancelHref="/characters"
      />
    </div>
  );
}
