"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import type I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import i18n from "@/i18n/config";
import { normalizeLocale } from "@/i18n/locales";

/**
 * Client-side i18n provider for pages that are not under a `[lang]` route
 * (the English content pages and the 404). Detection (stored preference, then
 * the browser's user agent / navigator languages) is applied after hydration to
 * avoid a mismatch. Locale routes use `LocaleProvider` instead, which pins the
 * language to the URL and owns the `<html lang>` attribute.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const detector = i18n.services
      .languageDetector as I18nextBrowserLanguageDetector | undefined;
    const detected = detector?.detect();
    const next = normalizeLocale(Array.isArray(detected) ? detected[0] : detected);
    if (next !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(next);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
