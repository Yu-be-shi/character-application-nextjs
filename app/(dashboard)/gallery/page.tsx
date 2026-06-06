import { characterClient } from "@/lib/character-client";
import Link from "next/link";

const GENDER_LABEL: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  unknown: "不明",
};

export default async function GalleryPage() {
  const characters = await characterClient.list();

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px" }}>
        ギャラリー
      </h1>

      {characters.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#6c757d" }}>
          <p>まだキャラクターがいません。</p>
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
    </div>
  );
}
