import type { ReactNode } from "react";
import { lang } from "next/root-params";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import {
  dirForLocale,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from "@/i18n/locales";
import { rootMetadata, rootViewport } from "@/lib/metadata";
import { fontClassName } from "@/lib/fonts";
import { ThemeScript } from "@/components/ThemeScript";
import { SiteScripts } from "@/components/SiteScripts";
import "../../globals.css";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ lang: locale }));
}

/**
 * Root layout for the localized app. `[lang]` is a root parameter, so the
 * locale is available here and the `<html lang>`/`dir` are server-rendered.
 */
export default async function LocaleRootLayout({
  children,
}: {
  children: ReactNode;
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
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <SiteScripts />
      </body>
    </html>
  );
}
