import type { ReactNode } from "react";
import { lang } from "next/root-params";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { dirForLocale, normalizeLocale, SUPPORTED_LOCALES } from "@/i18n/locales";
import { rootMetadata, rootViewport } from "@/lib/metadata";
import { fontClassName } from "@/lib/fonts";
import { ThemeScript } from "@/components/ThemeScript";
import { ThemeSync } from "@/components/ThemeSync";
import { SiteScripts } from "@/components/SiteScripts";
import { SkatingShell } from "@/components/SkatingShell";
import "../../globals.css";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ lang: locale }));
}

// Only the generated locales are valid, so an unknown first segment (e.g.
// `/test`) is a routing-level 404 rather than being rendered as a locale.
export const dynamicParams = false;

/**
 * Root layout for the localized app. `[lang]` is a root parameter, so the
 * locale is available here and the `<html lang>`/`dir` are server-rendered.
 *
 * The persistent skating shell (provider + map + sidebar + filters) lives here
 * so it stays mounted across navigation; the page content (`children`, the
 * `sr-only` SEO markup) and the `@modal` slot render inside it.
 */
export default async function LocaleRootLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  const locale = normalizeLocale(await lang());
  return (
    <html
      lang={locale}
      dir={dirForLocale(locale)}
      suppressHydrationWarning
      className={`${fontClassName} h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden">
        <ThemeScript />
        <ThemeSync />
        <LocaleProvider locale={locale}>
          <SkatingShell modal={modal}>{children}</SkatingShell>
        </LocaleProvider>
        <SiteScripts />
      </body>
    </html>
  );
}
