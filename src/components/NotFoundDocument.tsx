import { fontClassName } from "@/lib/fonts";
import { ThemeScript } from "@/components/ThemeScript";
import { I18nProvider } from "@/components/I18nProvider";
import { NotFoundPage } from "@/components/NotFoundPage";
import { SiteScripts } from "@/components/SiteScripts";
import type { Locale } from "@/i18n/locales";

/**
 * A complete 404 document (`<html>`/`<body>` + styles/fonts/theme/i18n) for URLs
 * that render outside the app's root layouts. Used by `global-not-found` and by
 * the `(app)` not-found for a non-locale first segment.
 */
export function NotFoundDocument({ locale }: { locale?: Locale | null }) {
  return (
    <html
      lang={locale ?? "en"}
      suppressHydrationWarning
      className={`${fontClassName} h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden">
        <ThemeScript />
        <I18nProvider>
          <NotFoundPage locale={locale ?? null} />
        </I18nProvider>
        <SiteScripts />
      </body>
    </html>
  );
}
