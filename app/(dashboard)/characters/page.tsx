import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { characterClient } from "@/lib/character-client";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function MyCharactersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const t = await getTranslations("characters");
  const tg = await getTranslations("gender");

  const userChars = await prisma.userCharacter.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // 所有 ID だけをバッチ取得（API 呼び出しは1回・必要な行のみ。旧実装の N+1 を回避）。
  // userChars の順序（作成日の降順）を保ったまま並べる。
  const ownedIds = userChars.map((uc) => uc.characterId);
  const { items: owned } = await characterClient.list({ ids: ownedIds });
  const byId = new Map(owned.map((c) => [c.id, c]));
  const characters = userChars
    .map((uc) => byId.get(uc.characterId))
    .filter((c): c is NonNullable<typeof c> => c != null);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>{t("title")}</h1>
        <Link
          href="/characters/new"
          style={{
            padding: "8px 16px",
            background: "#0070f3",
            color: "#fff",
            borderRadius: "6px",
            fontWeight: 500,
          }}
        >
          {t("new")}
        </Link>
      </div>

      {characters.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#6c757d" }}>
          <p>{t("empty")}</p>
          <Link href="/characters/new" style={{ marginTop: "12px", display: "inline-block" }}>
            {t("createFirst")}
          </Link>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {characters.map((c) => (
            <li key={c.id}>
              <Link href={`/characters/${c.id}`} style={{ display: "block" }}>
                <div
                  style={{
                    border: "1px solid #e9ecef",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "#fff",
                    transition: "box-shadow 0.15s",
                  }}
                >
                  <h3 style={{ fontWeight: 600, marginBottom: "4px" }}>{c.name}</h3>
                  <p style={{ fontSize: "13px", color: "#6c757d" }}>
                    {c.race} · {tg(c.gender)}
                  </p>
                  {c.description && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#495057",
                        marginTop: "8px",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {c.description}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
