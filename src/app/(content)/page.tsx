"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from "@/i18n/locales";

/**
 * Redirect to the visitor's stored or browser-preferred locale, before the
 * browser paints. GitHub Pages (a static export) has no server to issue a
 * redirect, so this must run client-side; running it as an inline script in the
 * initial HTML avoids the visible flash a post-hydration effect would cause.
 */
function redirectScript(): string {
  return `(function(){var locales=${JSON.stringify(
    SUPPORTED_LOCALES
  )};function match(t){var b=String(t||"").toLowerCase().split(/[-_]/)[0];return locales.indexOf(b)>=0?b:null}var locale=null;try{locale=match(localStorage.getItem(${JSON.stringify(
    LOCALE_STORAGE_KEY
  )}))}catch(e){}if(!locale){var langs=navigator.languages||[navigator.language];for(var i=0;i<langs.length;i++){var m=match(langs[i]);if(m){locale=m;break}}}if(!locale){locale=${JSON.stringify(
    DEFAULT_LOCALE
  )}}location.replace("/"+locale+location.search+location.hash)})();`;
}

/** Locale name supported by the app, derived from a BCP-47 tag, or `null`. */
function matchLocale(tag: string | null): string | null {
  const base = String(tag ?? "").toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base) ? base : null;
}

/** The stored or browser-preferred locale, resolved in the browser. */
function preferredLocale(): string {
  let stored: string | null = null;
  try {
    stored = matchLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    stored = null;
  }
  if (stored) return stored;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

const subscribe = () => () => {};
const getServerSnapshot = () => null;
const getClientSnapshot = () => true;

/**
 * The locale-prefixed app lives at `/{lang}`, so the bare root has no page of
 * its own. Static export has no server to redirect, so this sends visitors to
 * their stored or browser-preferred locale on the client.
 *
 * The inline script is emitted while server-rendering (the server snapshot is
 * `null`, so it lands in the initial HTML and runs before paint, avoiding a
 * flash). It is intentionally not re-rendered on the client: React refuses to
 * execute scripts created during client rendering, which would drop the
 * redirect on a client-side navigation to `/`. There the mount effect below
 * performs the same redirect instead.
 */
export default function RootRedirect() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    router.replace(
      `/${preferredLocale()}${window.location.search}${window.location.hash}`
    );
  }, [router]);

  if (isClient) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: redirectScript() }} />
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=/${DEFAULT_LOCALE}`} />
      </noscript>
    </>
  );
}
