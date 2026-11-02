/**
 * Scraper for City of Toronto drop-in skating venues.
 *
 * Unlike scraper/bill-bolton-arena (a single-venue scraper with one meta
 * object), this scraper supports many venues at once.  The venue list lives in
 * ./meta.json as an array of entries, each tagged indoor/outdoor and carrying
 * the Toronto `locationId` used to fetch its drop-in schedule feed.
 *
 * Toronto publishes drop-in skate programs as dated events (not recurring
 * weekly blocks), one JSON feed per venue:
 *
 *   https://www.toronto.ca/data/parks/live/dropin/skate/<locationId>.json
 *
 * The feed is an array of grouped blocks; only the `r` rows hold program
 * entries (facility, category, date, time, age).  Each venue with data is
 * written to its own output file at src/data/<id>.json in the shape consumed
 * by src/data/schedules.ts.  Venues with no feed (or an empty one) are skipped
 * so we never emit an empty schedule.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMetaList, Program } from "../types.ts";
import { classifyProgram } from "../classify.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../src/data");

const TIMEZONE = "America/Toronto";

/** Source feed base for drop-in skate schedules, keyed by locationId. */
const FEED_BASE = "https://www.toronto.ca/data/parks/live/dropin/skate/";

// --- Fetch -------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": "gta-skating-scraper/0.1 (+local dev)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null; // 404 -> no schedule feed for this venue
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return null; // HTML error page or empty response
  }
}

// --- Parse -------------------------------------------------------------

interface FeedBlock {
  ts?: string;
  r?: FeedRow[];
}

interface FeedRow {
  f: string; // facility, e.g. "Ice Rink - 1"
  c: string; // category, e.g. "Leisure Skate: Older Adult (Unsupervised)"
  d: string; // date, YYYY-MM-DD
  t: string; // time, e.g. "03:30 PM - 05:00 PM"
  age?: string; // age range description
}

/** Convert "03:30 PM" -> "15:30" (HH:MM). */
function toHHMM(time: string): string | null {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number.parseInt(m[1], 10);
  const minute = Number.parseInt(m[2], 10);
  const isAm = m[3].toLowerCase() === "am";
  if (isAm && hour === 12) hour = 0;
  if (!isAm && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Split "03:30 PM - 05:00 PM" -> [start, end] as HH:MM. */
function parseTimeRange(text: string): [string, string] | null {
  const parts = text.split(/[-–—]/);
  if (parts.length !== 2) return null;
  const start = toHHMM(parts[0]);
  const end = toHHMM(parts[1]);
  if (!start || !end) return null;
  return [start, end];
}

/** Stable program id from facility, category and start time. */
function slug(facility: string, category: string, start: string): string {
  const raw = `${facility} ${category} ${start}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return raw.replace(/^-+|-+$/g, "").slice(0, 80);
}

/** Transform feed rows into flat programs with ISO datetime starts/ends. */
function buildPrograms(rows: FeedRow[]): Program[] {
  const seen = new Set<string>();
  const programs: Program[] = [];

  for (const row of rows) {
    const range = parseTimeRange(row.t);
    if (!range) continue;
    const program: Program = {
      id: randomUUID(),
      start: `${row.d}T${range[0]}`,
      end: `${row.d}T${range[1]}`,
      name: row.c,
      type: classifyProgram(row.c),
      notes: row.age || undefined,
      // City of Toronto drop-in skating is free.
      ticket: 0,
    };
    if (seen.has(program.id)) continue;
    seen.add(program.id);
    programs.push(program);
  }

  return programs.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

async function writeSchedule(
  meta: VenueMetaList["venues"][number],
  programs: Program[]
): Promise<string> {
  const payload: Venue = {
    name: meta.name,
    url: meta.url,
    timezone: TIMEZONE,
    address: meta.address,
    coordinates: meta.coordinates,
    schedule: {
      updatedAt: new Date().toISOString(),
      programs,
    },
  };
  const file = path.join(OUT_DIR, `${meta.id}.json`);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return file;
}

// --- Runner ------------------------------------------------------------

async function main(): Promise<void> {
  const meta = JSON.parse(
    await readFile(path.join(__dirname, "meta.json"), "utf8")
  ) as VenueMetaList;

  const written: string[] = [];
  const skipped: string[] = [];

  for (const venue of meta.venues) {
    const feed = await fetchJson<FeedBlock[]>(
      `${FEED_BASE}${venue.locationId}.json`
    );
    const rows = (feed ?? []).flatMap((b) => b.r ?? []);
    if (rows.length === 0) {
      skipped.push(venue.id);
      continue;
    }
    const programs = buildPrograms(rows);
    const file = await writeSchedule(venue, programs);
    written.push(venue.id);
    console.log(
      `[${venue.id}] ${rows.length} program row(s), ` +
        `${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
    );
  }

  console.log(
    `[toronto-ca] wrote ${written.length} venue(s): ${written.join(", ")}`
  );
  if (skipped.length > 0) {
    console.log(
      `[toronto-ca] skipped ${skipped.length} venue(s) with no data: ${skipped.join(", ")}`
    );
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});