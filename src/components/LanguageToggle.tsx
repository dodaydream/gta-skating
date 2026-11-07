"use client";

import { useTranslation } from "react-i18next";
import { cn } from "cn";
import {
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from "@/i18n/config";

export function LanguageToggle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const current = normalizeLocale(i18n.resolvedLanguage);

  const select = (locale: string) => {
    if (locale !== current) {
      void i18n.changeLanguage(locale);
    }
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage unavailable (private mode, blocked): language still applies.
    }
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
