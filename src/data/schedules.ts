import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Venue, VenueMeta } from "@/types/venue";
import type { Program, VenueProgram } from "@/types/schedule";
import { slugify } from "@/lib/slug";

import generated from "./generated/venue-meta.json";

/**
 * Server-side venue data, reconstructed from the committed generated artifacts
 * (baked venue metadata + monthly program shards). The raw per-venue scraped
 * JSON is no longer committed; it lives under out/scraped-data and is only an
 * input to `scraper/build-client-data.ts`.
 *
 * This module is imported only by server components, so the Node fs access and
 * the full program set never reach the client bundle.
 */

const SHARDS_DIR = path.join(process.cwd(), "public/data");
const SHARD_PATTERN = /^programs-\d{4}-\d{2}\.json$/;

function loadProgramsByVenueId(): Map<string, Program[]> {
  const byId = new Map<string, Program[]>();
  // A program can appear in two adjacent month shards (it straddles the
  // boundary); dedupe by program id.
  const seen = new Set<string>();
  let files: string[];
  try {
    files = readdirSync(SHARDS_DIR);
  } catch {
    return byId;
  }
  for (const file of files) {
    if (!SHARD_PATTERN.test(file)) continue;
    const rows = JSON.parse(
      readFileSync(path.join(SHARDS_DIR, file), "utf8")
    ) as VenueProgram[];
    for (const { venueId, ...program } of rows) {
      if (seen.has(program.id)) continue;
      seen.add(program.id);
      let list = byId.get(venueId);
      if (!list) {
        list = [];
        byId.set(venueId, list);
      }
      list.push(program);
    }
  }
  for (const list of byId.values()) {
    list.sort((a, b) => a.start.localeCompare(b.start));
  }
  return byId;
}

const programsByVenueId = loadProgramsByVenueId();

export const venues: Venue[] = (generated.venues as VenueMeta[]).map((meta) => ({
  name: meta.name,
  url: meta.url,
  timezone: meta.timezone,
  coordinates: meta.coordinates,
  address: meta.address,
  type: meta.type,
  info: meta.info,
  rinks: meta.rinks,
  amenities: meta.amenities,
  schedule: {
    updatedAt: meta.updatedAt,
    programs: programsByVenueId.get(meta.id) ?? [],
  },
}));

const bySlug = new Map<string, Venue>();
for (const venue of venues) {
  bySlug.set(slugify(venue.name), venue);
}

export function getVenueBySlug(slug: string): Venue | undefined {
  return bySlug.get(slug);
}

export function getSlugForVenue(name: string): string {
  return slugify(name);
}
