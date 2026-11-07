"use client";

import { useEffect } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/i18n/locales";

function matchLocale(tag: string | null | undefined): Locale | null {
  const base = (tag ?? "").toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as Locale)
    : null;
}

function detectLocale(): Locale {
  try {
    const stored = matchLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Storage unavailable (private mode, blocked): fall through to the browser.
  }
  for (const language of navigator.languages ?? [navigator.language]) {
    const match = matchLocale(language);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

/**
 * The locale-prefixed app lives at `/{lang}`, so the bare root has no page of
 * its own. Static export has no server to redirect, so this sends visitors to
 * their stored or browser-preferred locale on the client.
 */
export default function RootRedirect() {
  useEffect(() => {
    const locale = detectLocale();
    window.location.replace(
      `/${locale}${window.location.search}${window.location.hash}`
    );
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 dark:bg-black">
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=/${DEFAULT_LOCALE}`} />
      </noscript>
      <a
        href={`/${DEFAULT_LOCALE}`}
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Continue to GTA Skating →
      </a>
    </main>
  );
}
