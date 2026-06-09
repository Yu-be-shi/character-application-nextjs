import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "64px 24px", color: "#495057" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
        ページが見つかりません
      </h2>
      <p style={{ color: "#6c757d", fontSize: "14px", marginBottom: "16px" }}>
        お探しのページは存在しないか、アクセス権がありません。
      </p>
      <Link href="/characters" style={{ color: "#0070f3" }}>
        マイキャラクターに戻る →
      </Link>
    </div>
  );
}
