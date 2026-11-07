/**
 * Derives the client-facing data artifacts from the scraped venue JSON.
 *
 *  - src/data/generated/venue-meta.json — venue facts without the program
 *    schedule, baked into the client bundle so slug/coordinate lookups stay
 *    synchronous. Each venue carries a stable `id`.
 *  - public/data/programs-YYYY-MM.json — flat program lists sharded by month,
 *    each program carrying its `venueId`, fetched on demand for the months a
 *    query touches and joined to venue metadata after loading. `refId` is
 *    dropped because nothing reads it client-side.
 *
 * Reads the scraped JSON from out/scraped-data (git-ignored) and writes the
 * committed artifacts above. Venues whose scraper produced no file this run
 * (failed or skipped) are retained from the previously committed artifacts so a
 * single broken scraper never drops a venue. Run after scraping, or standalone
 * to regenerate. Usage:
 *   node scraper/build-client-data.ts
 */

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../src/lib/slug.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, "../out/scraped-data");
const META_OUT = path.resolve(HERE, "../src/data/generated/venue-meta.json");
const PROGRAMS_OUT_DIR = path.resolve(HERE, "../public/data");
const SHARD_PATTERN = /^programs-\d{4}-\d{2}\.json$/;

/** DNS namespace, used to derive stable UUIDv5 venue ids from their slug. */
const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Deterministic UUIDv5 (RFC 4122) so a venue's id is stable across regenerations
 * without persisting one in the source data.
 */
function venueId(slug: string): string {
  const namespace = Buffer.from(UUID_NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(namespace)
    .update(`gtaskating.com/venue/${slug}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface InfoItem {
  key: string;
  value: string;
}

interface Rink {
  name: string;
  type: string;
}

interface Program {
  id: string;
  refId?: string;
  start: string;
  end: string;
  name: string;
  type: string;
  notes?: string;
  ticket: number;
}

interface SourceVenue {
  name: string;
  url: string;
  timezone: string;
  coordinates: { lat: number; lon: number };
  address: string;
  type?: string;
  info?: InfoItem[];
  rinks?: Rink[];
  amenities?: string[];
  schedule: { updatedAt: string; programs: Program[] };
}

interface VenueMeta {
  id: string;
  name: string;
  url: string;
  timezone: string;
  coordinates: { lat: number; lon: number };
  address: string;
  type?: string;
  info?: InfoItem[];
  rinks?: Rink[];
  amenities?: string[];
  updatedAt: string;
}

/** A program with `refId` dropped and its venue id attached; stable key order. */
interface VenueProgram {
  venueId: string;
  id: string;
  start: string;
  end: string;
  name: string;
  type: string;
  notes?: string;
  ticket: number;
}

function toMeta(venue: SourceVenue, id: string): VenueMeta {
  const meta: VenueMeta = {
    id,
    name: venue.name,
    url: venue.url,
    timezone: venue.timezone,
    coordinates: venue.coordinates,
    address: venue.address,
    updatedAt: venue.schedule.updatedAt,
  };
  if (venue.type !== undefined) meta.type = venue.type;
  if (venue.info !== undefined) meta.info = venue.info;
  if (venue.rinks !== undefined) meta.rinks = venue.rinks;
  if (venue.amenities !== undefined) meta.amenities = venue.amenities;
  return meta;
}

function toProgram(program: Program, venueId: string): VenueProgram {
  const out: VenueProgram = {
    venueId,
    id: program.id,
    start: program.start,
    end: program.end,
    name: program.name,
    type: program.type,
    ticket: program.ticket,
  };
  if (program.notes !== undefined) out.notes = program.notes;
  return out;
}

function addToShard(
  shards: Map<string, VenueProgram[]>,
  month: string,
  program: VenueProgram
): void {
  const list = shards.get(month);
  if (list) list.push(program);
  else shards.set(month, [program]);
}

async function clearStaleShards(): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(PROGRAMS_OUT_DIR);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((name) => SHARD_PATTERN.test(name))
      .map((name) => unlink(path.join(PROGRAMS_OUT_DIR, name)))
  );
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Programs from the previously committed shards, for retaining missing venues. */
async function readExistingPrograms(): Promise<VenueProgram[]> {
  let entries: string[];
  try {
    entries = await readdir(PROGRAMS_OUT_DIR);
  } catch {
    return [];
  }
  const programs: VenueProgram[] = [];
  for (const name of entries) {
    if (!SHARD_PATTERN.test(name)) continue;
    const rows = await readJson<VenueProgram[]>(path.join(PROGRAMS_OUT_DIR, name));
    if (rows) programs.push(...rows);
  }
  return programs;
}

async function main(): Promise<void> {
  const files = (await readdir(DATA_DIR).catch(() => [])).filter((file) =>
    file.endsWith(".json")
  );

  const fresh: { meta: VenueMeta; programs: Program[] }[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(DATA_DIR, file), "utf8");
    const venue = JSON.parse(raw) as SourceVenue;
    fresh.push({
      meta: toMeta(venue, venueId(slugify(venue.name))),
      programs: venue.schedule.programs,
    });
  }
  const freshIds = new Set(fresh.map((venue) => venue.meta.id));

  // Retain venues whose scraper didn't produce a file this run.
  const existingMeta = await readJson<{ venues: VenueMeta[] }>(META_OUT);
  const existingPrograms = await readExistingPrograms();
  const retainedMetas = (existingMeta?.venues ?? []).filter(
    (venue) => !freshIds.has(venue.id)
  );
  const retainedPrograms = existingPrograms.filter(
    (program) => !freshIds.has(program.venueId)
  );

  const metas = [...fresh.map((venue) => venue.meta), ...retainedMetas].sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  const programs: VenueProgram[] = [];
  const seenProgramIds = new Set<string>();
  const pushProgram = (program: VenueProgram) => {
    if (seenProgramIds.has(program.id)) return;
    seenProgramIds.add(program.id);
    programs.push(program);
  };
  for (const venue of fresh) {
    for (const program of venue.programs) {
      pushProgram(toProgram(program, venue.meta.id));
    }
  }
  for (const program of retainedPrograms) pushProgram(program);

  const shards = new Map<string, VenueProgram[]>();
  for (const program of programs) {
    const startMonth = program.start.slice(0, 7);
    const endMonth = program.end.slice(0, 7);
    addToShard(shards, startMonth, program);
    // A program can straddle a month boundary; keep it in both shards so a
    // range query for either month still finds it.
    if (endMonth !== startMonth) addToShard(shards, endMonth, program);
  }

  const months = [...shards.keys()].sort();

  await mkdir(path.dirname(META_OUT), { recursive: true });
  await writeFile(
    META_OUT,
    `${JSON.stringify({ months, venues: metas }, null, 2)}\n`,
    "utf8"
  );

  await clearStaleShards();
  await mkdir(PROGRAMS_OUT_DIR, { recursive: true });
  for (const month of months) {
    const out = path.join(PROGRAMS_OUT_DIR, `programs-${month}.json`);
    await writeFile(out, `${JSON.stringify(shards.get(month))}\n`, "utf8");
  }

  console.log(
    `Wrote ${metas.length} venue meta (${retainedMetas.length} retained) and ` +
      `${months.length} program shard(s): ${months.join(", ")}`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
