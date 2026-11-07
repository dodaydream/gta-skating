import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "@/i18n/en";
import fr from "@/i18n/fr";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/i18n/locales";

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

/**
 * Create a standalone i18next instance pinned to a locale. Used by the
 * `[lang]` route, where the URL — not detection — decides the language, so the
 * server-rendered HTML and the first client render are already in the right
 * language. A fresh instance per request avoids locale leaking between pages.
 */
export function createI18nInstance(locale: Locale) {
  const instance = i18n.createInstance();
  instance.init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    nonExplicitSupportedLngs: true,
    initAsync: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

export default i18n;
