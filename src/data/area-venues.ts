import type { Venue } from "@/types/venue";
import type { Area } from "@/data/areas";
import { getSlugForVenue, venues } from "@/data/schedules";
import { distanceKm } from "@/lib/schedule";

export interface NearbyVenue {
  venue: Venue;
  slug: string;
  distanceKm: number;
}

/**
 * Venues within an area's radius, nearest-first.
 *
 * Server-only: `@/data/schedules` reads the program shards from disk, so this
 * must never be imported by a client component.
 */
export function getNearbyVenues(area: Area): NearbyVenue[] {
  return venues
    .map((venue) => {
      const { lat, lon } = venue.coordinates ?? {};
      return {
        venue,
        slug: getSlugForVenue(venue.name),
        distanceKm: distanceKm(area.center.lat, area.center.lon, lat, lon),
      };
    })
    .filter(
      (entry) => isFinite(entry.distanceKm) && entry.distanceKm <= area.radiusKm
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
