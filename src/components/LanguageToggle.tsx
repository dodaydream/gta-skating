"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { useLocale } from "@/i18n/LocaleProvider";
import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from "@/i18n/locales";

export function LanguageToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const select = (locale: string) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage unavailable (private mode, blocked): navigation still applies.
    }
    if (locale === current) return;
    // Swap the leading locale segment, keeping the rest of the path (e.g.
    // /en/venue/moss-park -> /fr/venue/moss-park).
    const rest = pathname.replace(/^\/[^/]+/, "");
    router.push(`/${locale}${rest}`);
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
