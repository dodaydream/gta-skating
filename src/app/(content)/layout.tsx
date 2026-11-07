import type { Metadata } from "next";
import type { ReactNode } from "react";
import { I18nProvider } from "@/components/I18nProvider";
import { rootMetadata, rootViewport } from "@/lib/metadata";
import { fontClassName } from "@/lib/fonts";
import { ThemeScript } from "@/components/ThemeScript";
import { ThemeSync } from "@/components/ThemeSync";
import { SiteScripts } from "@/components/SiteScripts";
import "../globals.css";

export const metadata: Metadata = {
  ...rootMetadata,
  alternates: { canonical: "/" },
};
export const viewport = rootViewport;

/** Root layout for the English content pages (and the `/` redirect). */
export default function ContentRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontClassName} h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden">
        <ThemeScript />
        <ThemeSync />
        <I18nProvider>{children}</I18nProvider>
        <SiteScripts />
      </body>
    </html>
  );
}
