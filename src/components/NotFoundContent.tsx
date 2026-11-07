"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import en from "@/i18n/en";
import fr from "@/i18n/fr";
import type { Locale } from "@/i18n/locales";

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
 * 404 body. Uses `locale` when given (the `[lang]` not-found passes it from the
 * URL param); otherwise it reads the locale from the URL, showing both languages
 * for a locale-less URL such as `/test`.
 */
export function NotFoundContent({ locale }: { locale?: Locale | null }) {
  const urlLocale = useSyncExternalStore(
    subscribe,
    localeFromPath,
    getServerLocale
  );

  const active = locale ?? urlLocale;
  const shown: readonly Locale[] = active ? [active] : ["en", "fr"];

  return (
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
          <div key={item} className="flex flex-col items-start gap-4">
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
  );
}
