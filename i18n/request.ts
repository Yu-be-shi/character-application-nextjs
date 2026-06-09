import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ja";
export const LOCALE_COOKIE = "LOCALE";

// ロケールは Cookie(LOCALE) で切り替える（URL に locale セグメントを持たない方式）。
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = (locales as readonly string[]).includes(cookieLocale ?? "")
    ? (cookieLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
