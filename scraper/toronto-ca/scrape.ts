/**
 * Scraper for City of Toronto drop-in skating venues.
 *
 * Unlike scraper/bill-bolton-arena (a single-venue scraper with one meta
 * object), this scraper supports many venues at once.  The venue list lives in
 * ./meta.json as an array of entries, each tagged indoor/outdoor and carrying
 * the Toronto `locationId` used to match its drop-in schedule.
 *
 * Schedules come from the City of Toronto Open Data "Registered Programs and
 * Drop In Courses Offering" dataset (package 1a5be46a-4039-48cd-a2d2-8e702abf9516),
 * using its actively-datastored "Drop-in" resource.  A single section-filtered
 * request returns every skating drop-in occurrence city-wide:
 *
 *   .../datastore_search?id=<dropInResourceId>&filters={"Section":"Skate - Drop-In"}
 *
 * Each datastore row is one occurrence (`First Date` == `Last Date`), so no
 * recurrence expansion is needed.  Rows are grouped by `Location ID` and
 * matched to meta.json venues.  Every venue in meta.json is written to its own
 * output file at out/scraped-data/<slug>.json (the full slug of the venue name) in the
 * shape consumed by scraper/build-client-data.ts — including venues with no programs
 * right now, so the app can show "no upcoming sessions" instead of hiding them.
 *
 * Freshness: the Open Data dataset refreshes weekly (~1 day behind the City's
 * live calendar), so cancellations and closures may lag.  Unlike the previous
 * per-venue live feed, this source also covers outdoor venues.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMetaList, Program } from "../types.ts";
import { normalizeRinkType } from "../types.ts";
import { classifyProgram } from "../classify.ts";
import { slugify } from "../../src/lib/slug.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../out/scraped-data");

const TIMEZONE = "America/Toronto";

/** City of Toronto Open Data CKAN API and the drop-in dataset package id. */
const API_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action";
const PKG_ID = "1a5be46a-4039-48cd-a2d2-8e702abf9516";

/** The one Section we scrape out of the drop-in dataset. */
const SECTION = "Skate - Drop-In";

/** Name of the datastore resource holding drop-in occurrences. */
const DROP_IN_RESOURCE = "Drop-in";

/** CKAN page cap; the skating slice is well under this, so one page suffices. */
const PAGE_LIMIT = 32_000;

// --- Data shapes -------------------------------------------------------

/** One drop-in occurrence row from the "Drop-in" datastore resource. */
interface SkateRow {
  "Location ID": number;
  Course_ID: number;
  "Course Title": string;
  Section: string;
  "Age Min": string;
  "Age Max": string;
  "Start Hour": number;
  "Start Minute": number;
  "End Hour": number;
  "End Min": number;
  "First Date": string;
  "Last Date": string;
  DayOftheWeek: string;
}

interface CkanResource {
  id: string;
  name?: string;
  datastore_active?: boolean;
}

interface PackageShowResponse {
  success: boolean;
  result?: { resources?: CkanResource[] };
}

interface SearchResponse {
  success: boolean;
  result?: {
    total: number;
    records: SkateRow[];
    _links?: { next?: string };
  };
}

// --- Fetch -------------------------------------------------------------

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "gta-skating-scraper/0.1 (+local dev)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/** Resolve the datastore id of the dataset's active "Drop-in" resource. */
async function findDropInResourceId(): Promise<string> {
  const doc = await getJson<PackageShowResponse>(
    `${API_BASE}/package_show?id=${PKG_ID}`
  );
  if (!doc.success) throw new Error(`package_show failed for ${PKG_ID}`);
  const resource = doc.result?.resources?.find(
    (r) => r.datastore_active === true && r.name === DROP_IN_RESOURCE
  );
  if (!resource) {
    throw new Error(
      `No active "${DROP_IN_RESOURCE}" resource in dataset ${PKG_ID}`
    );
  }
  return resource.id;
}

/** Fetch every skating drop-in occurrence, paging if the slice exceeds a page. */
async function fetchSkatingRows(): Promise<SkateRow[]> {
  const resourceId = await findDropInResourceId();
  const filters = encodeURIComponent(JSON.stringify({ Section: SECTION }));
  let url: string | null =
    `${API_BASE}/datastore_search?id=${resourceId}` +
    `&filters=${filters}&limit=${PAGE_LIMIT}`;

  const records: SkateRow[] = [];
  let total = Number.POSITIVE_INFINITY;
  while (url && records.length < total) {
    const doc: SearchResponse = await getJson<SearchResponse>(url);
    if (!doc.success || !doc.result) {
      throw new Error(`datastore_search failed for resource ${resourceId}`);
    }
    const result = doc.result;
    total = result.total;
    records.push(...result.records);
    // CKAN always returns a `next` link, even past the end, so stop on `total`.
    const next: string | undefined =
      records.length < total ? result._links?.next : undefined;
    url = next ? new URL(next, API_BASE).toString() : null;
  }

  if (records.length === 0) {
    // A renamed Section would otherwise silently wipe every Toronto schedule.
    throw new Error(`datastore_search returned 0 rows for Section "${SECTION}"`);
  }
  return records;
}

// --- Parse -------------------------------------------------------------

/** Today's date (YYYY-MM-DD) in the venue timezone. */
function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date()
  );
}

/** Zero-padded 24-hour "HH:MM" from the dataset's numeric hour/minute. */
function hhmm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Age note from the dataset's Age Min/Max.
 *
 * The dataset metadata labels these as months, but for skating they are years:
 * verified against the previous feed, where 60 -> "60 years and over" and
 * 0 - 12 -> "0 - 12 years".  Age Max "None" means unbounded.
 */
function ageNotes(min: string, max: string): string | undefined {
  if (!min || min === "None") return undefined;
  if (!max || max === "None") return `${min} years and over`;
  return `${min} - ${max} years`;
}

/** Transform one venue's rows into flat programs with local ISO datetimes. */
function buildPrograms(rows: SkateRow[]): Program[] {
  const today = todayStr();
  const seen = new Set<string>();
  const programs: Program[] = [];

  for (const row of rows) {
    const date = row["First Date"];
    if (date < today) continue; // drop past occurrences; the app only shows upcoming
    const start = hhmm(row["Start Hour"], row["Start Minute"]);
    // Each row is a single occurrence (First Date == Last Date), so key on the
    // occurrence itself.  refId is the city's id: Course_ID + date + start.
    const refId = `${row.Course_ID}|${date}|${start}`;
    if (seen.has(refId)) continue;
    seen.add(refId);

    programs.push({
      id: randomUUID(),
      refId,
      start: `${date}T${start}`,
      end: `${date}T${hhmm(row["End Hour"], row["End Min"])}`,
      name: row["Course Title"],
      type: classifyProgram(row["Course Title"]),
      notes: ageNotes(row["Age Min"], row["Age Max"]),
      // City of Toronto drop-in skating is free.
      ticket: 0,
    });
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
    type: normalizeRinkType(meta.type),
    coordinates: meta.coordinates,
    rinks: meta.rinks,
    amenities: meta.amenities,
    info: meta.info,
    schedule: {
      updatedAt: new Date().toISOString(),
      programs,
    },
  };
  const file = path.join(OUT_DIR, `${slugify(meta.name)}.json`);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return file;
}

// --- Runner ------------------------------------------------------------

async function main(): Promise<void> {
  const meta = JSON.parse(
    await readFile(path.join(__dirname, "meta.json"), "utf8")
  ) as VenueMetaList;

  const rows = await fetchSkatingRows();
  const rowsByLocation = new Map<number, SkateRow[]>();
  for (const row of rows) {
    const id = Number(row["Location ID"]);
    const list = rowsByLocation.get(id);
    if (list) list.push(row);
    else rowsByLocation.set(id, [row]);
  }

  let totalPrograms = 0;
  for (const venue of meta.venues) {
    const venueRows =
      typeof venue.locationId === "number"
        ? rowsByLocation.get(venue.locationId) ?? []
        : [];
    const programs = buildPrograms(venueRows);
    totalPrograms += programs.length;
    const file = await writeSchedule(venue, programs);
    console.log(
      `[${venue.id}] ${programs.length} program(s) -> ` +
        `${path.relative(process.cwd(), file)}`
    );
  }

  console.log(
    `[toronto-ca] wrote ${meta.venues.length} venue(s), ` +
      `${rows.length} row(s), ${totalPrograms} program(s)`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
