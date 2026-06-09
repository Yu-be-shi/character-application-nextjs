"use client";

// ルートレイアウトで起きた致命的エラーの最終フォールバック（html/body を自前で描画する）。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
            予期しないエラーが発生しました
          </h2>
          <p style={{ color: "#6c757d", fontSize: "14px", marginBottom: "16px" }}>
            時間をおいて再度お試しください。{error.digest ? `(${error.digest})` : ""}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              background: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
            }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
