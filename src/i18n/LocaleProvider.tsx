"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { I18nextProvider } from "react-i18next";
import { createI18nInstance } from "@/i18n/config";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";

type LocaleContextValue = {
  locale: Locale;
  /** Switch the active locale in place, without a route change. */
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/** The active locale for the current `[lang]` route. */
export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

/** Switch the active locale in place, without a route change. */
export function useSetLocale(): (locale: Locale) => void {
  return useContext(LocaleContext).setLocale;
}

/**
 * Provides the URL locale to the app subtree: a locale-pinned i18next instance
 * so client components render the right language on both the server and the
 * first client render, plus the locale itself for building localized links.
 *
 * The locale can also be switched client-side via `useSetLocale`, which keeps
 * the current route (and therefore the map and program list) mounted instead of
 * triggering the full remount a `[lang]` route change would cause.
 */
export function LocaleProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const i18n = useMemo(() => createI18nInstance(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale }),
    [locale]
  );

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}
