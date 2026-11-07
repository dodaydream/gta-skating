"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createI18nInstance } from "@/i18n/config";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** The active locale for the current `[lang]` route. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/**
 * Provides the URL locale to the app subtree: a locale-pinned i18next instance
 * so client components render the right language on both the server and the
 * first client render, plus the locale itself for building localized links.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const i18n = useMemo(() => createI18nInstance(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider value={locale}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}
