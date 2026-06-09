import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div style={{ textAlign: "center", padding: "64px 24px", color: "#495057" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
        {t("notFoundTitle")}
      </h2>
      <p style={{ color: "#6c757d", fontSize: "14px", marginBottom: "16px" }}>
        {t("notFoundDesc")}
      </p>
      <Link href="/characters" style={{ color: "#0070f3" }}>
        {t("backToCharacters")} →
      </Link>
    </div>
  );
}
