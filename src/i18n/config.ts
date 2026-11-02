import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/en";
import fr from "@/i18n/fr";

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

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      // Start in the default locale so the server-rendered HTML and the first
      // client render agree; the detected locale is applied after hydration.
      lng: DEFAULT_LOCALE,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: SUPPORTED_LOCALES,
      nonExplicitSupportedLngs: true,
      initAsync: false,
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        // Disable automatic caching: otherwise i18next persists the default
        // locale on init and then detects that stale value on the next load.
        caches: [],
        lookupLocalStorage: LOCALE_STORAGE_KEY,
      },
      react: { useSuspense: false },
    });
}

export default i18n;
