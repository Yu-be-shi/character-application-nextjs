import { characterClient } from "@/lib/character-client";
import { GENDER_LABEL, GALLERY_PAGE_SIZE } from "@/lib/constants";
import Link from "next/link";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * GALLERY_PAGE_SIZE;

  // 総件数は API が返さないため、1件多く取得して「次ページの有無」を判定する。
  const rows = await characterClient.list({ limit: GALLERY_PAGE_SIZE + 1, offset });
  const hasNext = rows.length > GALLERY_PAGE_SIZE;
  const characters = hasNext ? rows.slice(0, GALLERY_PAGE_SIZE) : rows;

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>
        ギャラリー
      </h1>

      {characters.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#6c757d" }}>
          <p>{page > 1 ? "このページにキャラクターはいません。" : "まだキャラクターがいません。"}</p>
          <Link href="/characters/new" style={{ marginTop: "12px", display: "inline-block" }}>
            最初のキャラクターを作成する →
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
                    {c.race} · {GENDER_LABEL[c.gender] ?? c.gender}
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
              ← 前のページ
            </Link>
          ) : (
            <span />
          )}
          <span style={{ fontSize: "13px", color: "#6c757d" }}>ページ {page}</span>
          {hasNext ? (
            <Link href={`/gallery?page=${page + 1}`} style={{ color: "#0070f3" }}>
              次のページ →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
