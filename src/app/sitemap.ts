import type { MetadataRoute } from "next";
import { venues, getSlugForVenue } from "@/data/schedules";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/data-sources`,
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
    ...venues.map((venue) => {
      const updated = venue.schedule.updatedAt
        ? new Date(venue.schedule.updatedAt)
        : now;
      return {
        url: `${SITE_URL}/venue/${getSlugForVenue(venue.name)}`,
        lastModified: updated,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    }),
  ];
}
