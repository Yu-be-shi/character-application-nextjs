import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import {
  characterClient,
  raceClient,
  CharacterApiError,
  type Character,
} from "@/lib/character-client";
import { isOwner } from "@/lib/authz";
import { parseCharacterForm } from "@/lib/character-form";
import { CharacterForm, type CharacterFormState } from "@/components/character-form";
import Link from "next/link";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  // 所有者でなければ存在を秘匿して 404（表示段階のガード）。
  if (!(await isOwner(session.user.id, id))) notFound();

  let character: Character;
  try {
    character = await characterClient.get(id);
  } catch {
    notFound();
  }

  const races = await raceClient.list();

  async function updateCharacter(
    _prev: CharacterFormState,
    formData: FormData,
  ): Promise<CharacterFormState> {
    "use server";
    const session = await auth();
    if (!session?.user?.id) return { error: "ログインが必要です" };

    // 表示時だけでなく Server Action 内でも所有権を再確認する（クライアント由来の ID を信用しない）。
    if (!(await isOwner(session.user.id, id))) return { error: "権限がありません" };

    const parsed = parseCharacterForm(formData);
    if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

    try {
      // 表示時に読み込んだ版を If-Match で送る（楽観ロック）。
      await characterClient.update(id, parsed.data, character.version);
    } catch (e) {
      if (e instanceof CharacterApiError && e.status === 412) {
        return {
          error:
            "このキャラクターは他の操作で更新されました。最新の内容を取得し直してから再度編集してください。",
        };
      }
      console.error("character update failed", id, e);
      return { error: "更新に失敗しました。時間をおいて再度お試しください。" };
    }

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

      <CharacterForm
        action={updateCharacter}
        races={races}
        defaults={{
          name: character.name,
          description: character.description,
          raceId: character.raceId,
          gender: character.gender,
          birthDate: character.birthDate ? character.birthDate.slice(0, 10) : "",
          birthPlace: character.birthPlace,
          heightCm: character.heightCm,
          weightKg: character.weightKg,
          bodyFatPercentage: character.bodyFatPercentage,
          sizeTop: character.sizeTop,
          sizeMiddle: character.sizeMiddle,
          sizeBottom: character.sizeBottom,
        }}
        submitLabel="更新する"
        cancelHref={`/characters/${id}`}
      />
    </div>
  );
}
