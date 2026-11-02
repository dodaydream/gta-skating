"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import type I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import i18n, { normalizeLocale } from "@/i18n/config";

/**
 * Client-side i18n provider. The static export renders the default locale, so
 * detection (stored preference, then the browser's user agent / navigator
 * languages) is applied after hydration to avoid a mismatch, and the detected
 * language is mirrored onto `<html lang>` for accessibility and search engines.
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

  useEffect(() => {
    const syncHtmlLang = () => {
      document.documentElement.lang = normalizeLocale(i18n.resolvedLanguage);
    };
    syncHtmlLang();
    i18n.on("languageChanged", syncHtmlLang);
    return () => {
      i18n.off("languageChanged", syncHtmlLang);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
