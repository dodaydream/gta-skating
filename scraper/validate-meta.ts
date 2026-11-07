/**
 * Validates venue amenity metadata against the predefined amenity keys.
 *
 * Checks every scraper/<source>/meta.json and the generated
 * src/data/generated/venue-meta.json:
 *   - every amenity key is one of the predefined keys (src/lib/amenity-keys.ts)
 *   - no amenity is listed twice on a venue
 *   - parking, when present, is exactly one of onsite_free_parking or
 *     onsite_paid_parking (never both)
 *
 * Exits non-zero when any venue violates the above, so the weekly scrape job
 * fails instead of committing malformed amenity data.
 *
 * Usage:  node scraper/validate-meta.ts
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AMENITIES } from "../src/lib/amenity-keys.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const ALLOWED = new Set<string>(AMENITIES);
const PARKING = new Set(["onsite_free_parking", "onsite_paid_parking"]);

interface AmenityVenue {
  name?: string;
  id?: string;
  amenities?: string[];
}

function collectProblems(file: string, venues: AmenityVenue[]): string[] {
  const problems: string[] = [];
  for (const venue of venues) {
    if (!Array.isArray(venue.amenities)) continue;
    const label = venue.name ?? venue.id ?? "?";
    const amenities = venue.amenities;

    const unknown = [...new Set(amenities.filter((a) => !ALLOWED.has(a)))];
    if (unknown.length) {
      problems.push(`${file} | ${label} | unknown amenity: ${unknown.join(", ")}`);
    }

    const dupes = [...new Set(amenities.filter((a, i) => amenities.indexOf(a) !== i))];
    if (dupes.length) {
      problems.push(`${file} | ${label} | duplicate amenity: ${dupes.join(", ")}`);
    }

    const parking = amenities.filter((a) => a.includes("parking"));
    const invalidParking = parking.filter((a) => !PARKING.has(a));
    if (invalidParking.length) {
      problems.push(
        `${file} | ${label} | invalid parking amenity: ${invalidParking.join(", ")}`
      );
    }
    if (parking.length > 1) {
      problems.push(
        `${file} | ${label} | multiple parking amenities: ${parking.join(", ")}`
      );
    }
  }
  return problems;
}

async function readVenues(file: string): Promise<AmenityVenue[]> {
  const json = JSON.parse(await readFile(file, "utf8")) as
    | { venues?: AmenityVenue[] }
    | AmenityVenue[];
  if (Array.isArray(json)) return json;
  return json.venues ?? [json as AmenityVenue];
}

async function metaFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(HERE, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const meta = path.join(HERE, entry.name, "meta.json");
    try {
      await readFile(meta, "utf8");
      files.push(meta);
    } catch {
      // This scraper folder has no meta.json.
    }
  }
  files.push(path.join(ROOT, "src/data/generated/venue-meta.json"));
  return files;
}

async function main(): Promise<void> {
  const files = await metaFiles();
  const problems: string[] = [];
  for (const file of files) {
    problems.push(...collectProblems(path.relative(ROOT, file), await readVenues(file)));
  }

  if (problems.length > 0) {
    console.error(`Amenity metadata validation failed (${problems.length}):`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Amenity metadata OK (${files.length} file(s) checked).`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
