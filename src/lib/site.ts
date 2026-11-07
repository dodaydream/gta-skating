import { SUPPORTED_LOCALES } from "@/i18n/locales";

/** Canonical production origin, used for absolute URLs in metadata and SEO output. */
export const SITE_URL = "https://gtaskating.com";

export const SITE_NAME = "GTA Skating";

/** Public GitHub repository, used for issue-report links. */
export const SITE_REPO = "https://github.com/dodaydream/gta-skating";

export const SITE_DESCRIPTION =
  "Find public skating, figure skating, shinny, and hockey schedules at rinks across the Greater Toronto Area, with live times and an interactive map.";

/**
 * Build `alternates` (canonical + hreflang) for a localized app route. `path`
 * is the locale-independent path, e.g. "" for the home page or
 * `/venue/<slug>` for a venue.
 */
export function localizedAlternates(lang: string, path: string) {
  const languages: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale] = `/${locale}${path}`;
  }
  languages["x-default"] = `/${SUPPORTED_LOCALES[0]}${path}`;
  return {
    canonical: `/${lang}${path}`,
    languages,
  };
}
