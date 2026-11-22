"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { fontClassName } from "@/lib/fonts";
import { ThemeScript } from "@/components/ThemeScript";
import { I18nProvider } from "@/components/I18nProvider";
import { SiteFooter } from "@/components/layouts/SiteFooter";
import { SiteScripts } from "@/components/SiteScripts";
import { notFoundMetadata } from "@/lib/metadata";
import { trackEvent } from "@/lib/analytics";
import en from "@/i18n/en";
import fr from "@/i18n/fr";
import type { Locale } from "@/i18n/locales";
import "./globals.css";

const COPY = { en: en.notFound, fr: fr.notFound } as const;

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Locale implied by the URL (e.g. `/en/...`), or null for a locale-less path. */
function localeFromPath(): Locale | null {
  const first = window.location.pathname
    .slice(BASE_PATH.length)
    .split("/")
    .filter(Boolean)[0];
  return first === "en" || first === "fr" ? first : null;
}

const subscribe = () => () => {};
const getServerLocale = () => null;

/**
 * Global 404 for unmatched URLs. It bypasses the app's root layouts (there are
 * two, plus a top-level `[lang]` segment), so this file renders the
 * `<html>`/`<body>`, wires up styles, fonts, theme, and i18n, and shows the
 * message in the locale implied by the URL. Served as `out/404.html`.
 *
 * Because it is a client component (it reads the URL and reports the 404), it
 * cannot use the `metadata`/`viewport` exports; those tags are rendered
 * directly and hoisted into `<head>`.
 */
export default function GlobalNotFound() {
  useEffect(() => {
    trackEvent("page_not_found", {
      path: window.location.pathname,
      referrer: document.referrer,
    });
  }, []);

  const urlLocale = useSyncExternalStore(
    subscribe,
    localeFromPath,
    getServerLocale
  );

  const shown: readonly Locale[] = urlLocale ? [urlLocale] : ["en", "fr"];

  return (
    <html
      lang={urlLocale ?? "en"}
      suppressHydrationWarning
      className={`${fontClassName} h-dvh overflow-hidden antialiased`}
    >
      <head>
        <title>{String(notFoundMetadata.title)}</title>
        <meta
          name="description"
          content={String(notFoundMetadata.description)}
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#fafafa"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#000000"
        />
      </head>
      <body className="flex h-full flex-col overflow-hidden">
        <ThemeScript />
        <I18nProvider>
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-zinc-50 dark:bg-black">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
              <div className="flex flex-1 flex-col justify-center py-10">
                <div className="flex w-full flex-col gap-8 text-left">
                  <p
                    aria-hidden="true"
                    className="text-6xl font-bold tracking-tight text-zinc-200 select-none sm:text-7xl dark:text-zinc-800"
                  >
                    404
                  </p>
                  <div
                    className={cn(
                      "grid grid-cols-1 gap-8",
                      shown.length > 1 && "md:grid-cols-2"
                    )}
                  >
                    {shown.map((item) => (
                      <div
                        key={item}
                        className="flex flex-col items-start gap-4"
                      >
                        <div className="flex flex-col gap-2">
                          <h1
                            lang={item}
                            className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50"
                          >
                            {COPY[item].title}
                          </h1>
                          <p
                            lang={item}
                            className="max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400"
                          >
                            {COPY[item].message}
                          </p>
                        </div>
                        <Link
                          href={`/${item}`}
                          lang={item}
                          className={buttonVariants({
                            size: "lg",
                            className: "h-11 w-fit px-5",
                          })}
                        >
                          {COPY[item].backToSchedule}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <SiteFooter />
            </div>
          </main>
        </I18nProvider>
        <SiteScripts />
      </body>
    </html>
  );
}
