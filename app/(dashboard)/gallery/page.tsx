import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { characterClient } from "@/lib/character-client";
import { GALLERY_PAGE_SIZE } from "@/lib/constants";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // 認証はレイアウトに頼らずページ自身でも確認する（他の保護ページと同じ方針）。
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("gallery");
  const tg = await getTranslations("gender");
  const { page: pageParam } = await searchParams;
  // 小数・負数・非数値はすべて 1 ページ目に丸める（API へ半端な offset を渡さない）。
  const page = Math.max(1, Math.floor(Number(pageParam) || 1));
  const offset = (page - 1) * GALLERY_PAGE_SIZE;

  // total（総件数）で正確なページャを作る。
  const { items: characters, total } = await characterClient.list({
    limit: GALLERY_PAGE_SIZE,
    offset,
  });
  const totalPages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));
  const hasNext = page < totalPages;

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>{t("title")}</h1>

      {characters.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#6c757d" }}>
          <p>{page > 1 ? t("emptyPage") : t("empty")}</p>
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

      {(page > 1 || hasNext) && (
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "32px",
          }}
        >
          {page > 1 ? (
            <Link href={`/gallery?page=${page - 1}`} style={{ color: "#0070f3" }}>
              {t("prev")}
            </Link>
          ) : (
            <span />
          )}
          <span style={{ fontSize: "13px", color: "#6c757d" }}>
            {t("pageInfo", { page, totalPages, total })}
          </span>
          {hasNext ? (
            <Link href={`/gallery?page=${page + 1}`} style={{ color: "#0070f3" }}>
              {t("next")}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
