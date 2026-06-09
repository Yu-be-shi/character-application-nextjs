"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

// ロケールを Cookie(LOCALE) に保存して再取得する切替 UI（URL に locale を持たない方式）。
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    document.cookie = `LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <select
      aria-label={t("label")}
      value={locale}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      style={{
        fontSize: "13px",
        padding: "4px 6px",
        border: "1px solid #ced4da",
        borderRadius: "6px",
      }}
    >
      <option value="ja">{t("ja")}</option>
      <option value="en">{t("en")}</option>
    </select>
  );
}
