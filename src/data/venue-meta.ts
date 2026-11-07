import type { Venue, VenueMeta } from "@/types/venue";
import type { Program } from "@/types/schedule";
import { slugify } from "@/lib/slug";

import generated from "./generated/venue-meta.json";

/**
 * Baked-in venue facts (no program schedule) so slug/coordinate lookups are
 * synchronous on the client. Generated from src/data by
 * `scraper/build-client-data.ts`.
 */
export const venueMeta = generated.venues as VenueMeta[];

/** Months ("YYYY-MM") that have a generated program shard. */
export const programMonths = generated.months as string[];

const bySlug = new Map<string, VenueMeta>();
for (const venue of venueMeta) {
  bySlug.set(slugify(venue.name), venue);
}

export function getVenueBySlug(slug: string): VenueMeta | undefined {
  return bySlug.get(slug);
}

export function getSlugForVenue(name: string): string {
  return slugify(name);
}

/** Combine baked metadata with fetched programs into a full venue. */
export function toVenue(meta: VenueMeta, programs: Program[]): Venue {
  return {
    name: meta.name,
    url: meta.url,
    timezone: meta.timezone,
    coordinates: meta.coordinates,
    address: meta.address,
    type: meta.type,
    info: meta.info,
    rinks: meta.rinks,
    amenities: meta.amenities,
    schedule: { updatedAt: meta.updatedAt, programs },
  };
}
