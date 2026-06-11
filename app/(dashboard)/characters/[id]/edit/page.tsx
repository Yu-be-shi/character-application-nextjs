import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  characterClient,
  raceClient,
  CharacterApiError,
  type Character,
} from "@/lib/character-client";
import { isOwner } from "@/lib/authz";
import { parseCharacterForm } from "@/lib/character-form";
import { CharacterForm, type CharacterFormState } from "@/components/character-form";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const t = await getTranslations("form");

  // 所有者でなければ存在を秘匿して 404（表示段階のガード）。
  if (!(await isOwner(session.user.id, id))) notFound();

  let character: Character;
  try {
    character = await characterClient.get(id);
  } catch (e) {
    // 404 のときだけ「見つかりません」。API ダウン等はエラーバウンダリに流す。
    if (e instanceof CharacterApiError && e.status === 404) notFound();
    throw e;
  }

  const races = await raceClient.list();

  async function updateCharacter(
    _prev: CharacterFormState,
    formData: FormData,
  ): Promise<CharacterFormState> {
    "use server";
    const tf = await getTranslations("form");
    const session = await auth();
    if (!session?.user?.id) return { error: tf("errLogin") };

    // 表示時だけでなく Server Action 内でも所有権を再確認する（クライアント由来の ID を信用しない）。
    if (!(await isOwner(session.user.id, id))) return { error: tf("errForbidden") };

    const parsed = parseCharacterForm(formData);
    if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

    // If-Match に使う版。初回は表示時に読み込んだ版、412 後の再送信は
    // フォーム状態経由で受け取った最新版（hidden input）を使う。
    // 版は楽観ロックの期待値であり認可情報ではないため、クライアント経由でよい
    // （所有権は上の isOwner で別途検証済み）。
    const rawVersion = Number(formData.get("version"));
    const expectedVersion =
      Number.isInteger(rawVersion) && rawVersion > 0 ? rawVersion : character.version;

    try {
      await characterClient.update(id, parsed.data, expectedVersion);
    } catch (e) {
      if (e instanceof CharacterApiError && e.status === 412) {
        // 競合を通知しつつ最新版を返す。ユーザーが内容を確認して再送信すれば
        // 入力を失わずに保存できる（再送信は最新版への上書きになる）。
        try {
          const latest = await characterClient.get(id);
          return { error: tf("errConflict"), latestVersion: latest.version };
        } catch {
          return { error: tf("errConflict") };
        }
      }
      console.error("character update failed", id, e);
      return { error: tf("errUpdate") };
    }

    // 更新が反映されたので関連ページのキャッシュを無効化してから遷移する。
    revalidatePath("/characters");
    revalidatePath(`/characters/${id}`);
    revalidatePath("/gallery");
    redirect(`/characters/${id}`);
  }

  return (
    <div style={{ maxWidth: "480px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link href={`/characters/${id}`} style={{ fontSize: "13px", color: "#6c757d" }}>
          {t("backToDetail")}
        </Link>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>{t("editTitle")}</h1>
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
        mode="edit"
        cancelHref={`/characters/${id}`}
        version={character.version}
      />
    </div>
  );
}
