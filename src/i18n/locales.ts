export const SUPPORTED_LOCALES = ["en", "fr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "gta-skating-locale";

export function normalizeLocale(lng: string | undefined | null): Locale {
  const base = (lng ?? "").toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as Locale)
    : DEFAULT_LOCALE;
}

const RTL_LOCALES: readonly string[] = ["ar", "he", "fa", "ur"];

/** Writing direction for a locale. All supported locales are LTR today. */
export function dirForLocale(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}
