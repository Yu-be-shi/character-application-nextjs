"use client";

import { useTranslations } from "next-intl";

// ダッシュボード配下のセグメントエラー境界（API ダウン等の実行時エラーを受け止める）。
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  return (
    <div style={{ textAlign: "center", padding: "64px 24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        {t("segTitle")}
      </h2>
      <p style={{ color: "#6c757d", fontSize: "14px", marginBottom: "16px" }}>
        {t("segDesc")} {error.digest ? `(${error.digest})` : ""}
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
        {tc("retry")}
      </button>
    </div>
  );
}
