import type { Metadata, Viewport } from "next";
import { fontClassName } from "@/lib/fonts";
import { ThemeScript } from "@/components/ThemeScript";
import { I18nProvider } from "@/components/I18nProvider";
import { NotFoundPage } from "@/components/NotFoundPage";
import { SiteScripts } from "@/components/SiteScripts";
import { notFoundMetadata, rootViewport } from "@/lib/metadata";
import "./globals.css";

export const metadata: Metadata = notFoundMetadata;

export const viewport: Viewport = rootViewport;

/**
 * Global 404 for unmatched URLs. It bypasses the app's root layouts (there are
 * two, plus a top-level `[lang]` segment), so this file renders the
 * `<html>`/`<body>` and wires up styles, fonts, theme, and i18n. Served as
 * `out/404.html`.
 */
export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontClassName} h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden">
        <ThemeScript />
        <I18nProvider>
          <NotFoundPage />
        </I18nProvider>
        <SiteScripts />
      </body>
    </html>
  );
}
