"use client";

import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { useLocale, useSetLocale } from "@/i18n/LocaleProvider";
import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type Locale } from "@/i18n/locales";

export function LanguageToggle({
  className,
  onSelect,
}: {
  className?: string;
  /** Called after the locale is switched (e.g. to dismiss a settings panel). */
  onSelect?: () => void;
}) {
  const { t } = useTranslation();
  const current = useLocale();
  const setLocale = useSetLocale();

  const select = (locale: Locale) => {
    if (locale === current) return;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage unavailable (private mode, blocked): switching still applies.
    }
    // Swap the leading locale segment in place. This deliberately avoids a
    // router navigation: changing the `[lang]` root param would remount the
    // route (reloading the map and the program list), so instead the URL and
    // the client locale are updated together without a route change.
    const { pathname, search, hash } = window.location;
    const rest = pathname.replace(/^\/[^/]+/, "");
    window.history.replaceState(null, "", `/${locale}${rest}${search}${hash}`);
    setLocale(locale);
    onSelect?.();
  };

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg border border-transparent bg-secondary p-0.5 text-secondary-foreground",
        className
      )}
    >
      {SUPPORTED_LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            aria-pressed={active}
            onClick={() => select(locale)}
            className={cn(
              "h-full min-w-9 rounded-md px-2 text-center text-[11px] font-semibold uppercase tracking-wide transition-colors",
              active
                ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                : "text-muted-foreground hover:text-secondary-foreground"
            )}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
}
