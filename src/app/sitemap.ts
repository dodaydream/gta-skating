import type { MetadataRoute } from "next";
import { venues, getSlugForVenue } from "@/data/schedules";
import { SITE_URL } from "@/lib/site";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

export const dynamic = "force-static";

/** hreflang alternates for a locale-independent app path (e.g. "" or /venue/x). */
function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${path}`;
  }
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const homeEntries: MetadataRoute.Sitemap = SUPPORTED_LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 1,
    alternates: { languages: languageAlternates("") },
  }));

  const venueEntries: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
    venues.map((venue) => {
      const slug = getSlugForVenue(venue.name);
      const updated = venue.schedule.updatedAt
        ? new Date(venue.schedule.updatedAt)
        : now;
      return {
        url: `${SITE_URL}/${locale}/venue/${slug}`,
        lastModified: updated,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: { languages: languageAlternates(`/venue/${slug}`) },
      };
    })
  );

  return [
    ...homeEntries,
    {
      url: `${SITE_URL}/data-sources`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...venueEntries,
  ];
}
