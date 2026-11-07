/**
 * Scraper for Canlan Sports drop-in skating (Daysmart Recreation / DASH).
 *
 * Canlan publishes its drop-in events through the Daysmart Recreation JSON:API
 * used by the member app at
 * https://apps.daysmartrecreation.com/dash/x/canlan/event-registration
 *
 * The app works in two steps and we mirror both:
 *
 *   1. GET /v1/date-availabilities?filter[date__gte]=...&filter[date__lte]=...
 *      One record per date, each holding parallel arrays of event ids plus the
 *      program and facility each event belongs to. We keep the events whose
 *      program is a skating drop-in and whose facility is one of the venues in
 *      ./meta.json (the "facility id" mapping).
 *
 *   2. GET /v1/events?filter[id__in]=...&include=summary,homeTeam.product
 *      The full event rows, in batches of ids. The event's display name comes
 *      from its `summary`, its price from the home team's product, and its
 *      start/end are already in the venue's local time.
 *
 * Each venue with data is written to out/scraped-data/<slug>.json in the shape consumed
 * by scraper/build-client-data.ts; venues with no data in the window are skipped so we
 * never emit an empty schedule.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMetaList, Program } from "../types.ts";
import { normalizeRinkType } from "../types.ts";
import { ProgramType } from "../types.ts";
import { classifyProgram } from "../classify.ts";
import { slugify } from "../../src/lib/slug.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../out/scraped-data");

const TIMEZONE = "America/Toronto";

/** Daysmart Recreation JSON:API base and the Canlan tenant code. */
const API_BASE = "https://api.daysmartrecreation.com/v1/";
const COMPANY = "canlan";

/** Only emit events from today through this many days out. */
const LOOKAHEAD_DAYS = 31;

/** How many event ids to ask for in a single /events call. */
const ID_BATCH_SIZE = 50;

/**
 * Canlan drop-in programs to publish, keyed by Daysmart program id. These are
 * the skating drop-ins offered at the GTA facilities; the ids come from the
 * event-registration URL's `program_types` filter plus their skating siblings.
 *   49 Shinny        50 Stick & Puck      51 Public Skating
 *   54 Senior Skate  57 Figure Skating    72 Holiday Skate
 */
const PROGRAM_IDS = new Set<number>([49, 50, 51, 54, 57, 72]);

/** Canonical program type for a program id (falls back to name matching). */
const PROGRAM_TYPES = new Map<number, ProgramType>([
  [49, ProgramType.PickupHockey],
  [50, ProgramType.StickAndPuck],
  [51, ProgramType.PublicSkate],
  [54, ProgramType.PublicSkate],
  [57, ProgramType.FigureSkating],
  [72, ProgramType.PublicSkate],
]);

// --- JSON:API shapes ---------------------------------------------------

interface Resource<T> {
  type: string;
  id: string;
  attributes: T;
}

interface Doc<T> {
  data: Resource<T>[];
  included?: Resource<Record<string, unknown>>[];
  errors?: { title?: string; detail?: string }[];
}

interface DateAvailability {
  date: string;
  events: number[];
  programs: number[];
  locations: number[];
}

interface EventAttributes {
  desc: string | null;
  start: string;
  end: string;
  hteam_id: number | null;
}

interface EventSummary {
  name: string;
}

interface Team {
  product_id: number | null;
}

interface Product {
  name: string;
  price: number | null;
}

// --- Fetch -------------------------------------------------------------

function buildUrl(
  resource: string,
  params: Record<string, string | number>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) qs.set(key, String(value));
  qs.set("company", COMPANY);
  return `${API_BASE}${resource}?${qs.toString()}`;
}

async function fetchDoc<T>(
  resource: string,
  params: Record<string, string | number>
): Promise<Doc<T>> {
  const url = buildUrl(resource, params);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "gta-skating-scraper/0.1 (+local dev)",
      Accept: "application/vnd.api+json",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  const doc = (await res.json()) as Doc<T>;
  if (doc.errors && doc.errors.length > 0) {
    const first = doc.errors[0];
    throw new Error(`GET ${url} -> ${first.title ?? "error"}: ${first.detail ?? ""}`);
  }
  return doc;
}

/** Index an `included` array by resource type and id. */
function indexIncluded(
  included: Resource<Record<string, unknown>>[] | undefined
): Map<string, Map<string, Record<string, unknown>>> {
  const byType = new Map<string, Map<string, Record<string, unknown>>>();
  for (const resource of included ?? []) {
    let bucket = byType.get(resource.type);
    if (!bucket) {
      bucket = new Map<string, Record<string, unknown>>();
      byType.set(resource.type, bucket);
    }
    bucket.set(resource.id, resource.attributes);
  }
  return byType;
}

// --- Parse -------------------------------------------------------------

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** "2026-11-02T10:15:00" -> "2026-11-02T10:15". */
function toLocalDateTime(value: string): string {
  return value.slice(0, 16);
}

function programType(programId: number, name: string): ProgramType {
  return PROGRAM_TYPES.get(programId) ?? classifyProgram(name);
}

/**
 * Map every in-window date-availability row to the events belonging to one of
 * our venues, keyed by event id. Also returns the Daysmart program id so the
 * event can be classified even when its title is ambiguous.
 */
function collectEvents(
  rows: DateAvailability[],
  venueFacilityIds: Set<number>
): Map<string, { facilityId: number; programId: number }> {
  const events = new Map<string, { facilityId: number; programId: number }>();
  for (const row of rows) {
    const count = Math.min(
      row.events?.length ?? 0,
      row.programs?.length ?? 0,
      row.locations?.length ?? 0
    );
    for (let i = 0; i < count; i += 1) {
      const programId = row.programs[i];
      const facilityId = row.locations[i];
      if (!PROGRAM_IDS.has(programId)) continue;
      if (!venueFacilityIds.has(facilityId)) continue;
      events.set(String(row.events[i]), { facilityId, programId });
    }
  }
  return events;
}

/** Turn the fetched event rows into programs, grouped by facility id. */
function buildPrograms(
  doc: Doc<EventAttributes>,
  eventFacility: Map<string, { facilityId: number; programId: number }>
): Map<number, Program[]> {
  const included = indexIncluded(doc.included);
  const summaries = included.get("event-summaries");
  const teams = included.get("teams");
  const products = included.get("products");

  const byFacility = new Map<number, Program[]>();
  const seen = new Set<string>();

  for (const event of doc.data) {
    const mapped = eventFacility.get(event.id);
    if (!mapped || seen.has(event.id)) continue;
    seen.add(event.id);

    const summary = summaries?.get(event.id) as EventSummary | undefined;
    const name = (summary?.name ?? event.attributes.desc ?? "").trim();
    if (!name) continue;

    const team = teams?.get(String(event.attributes.hteam_id)) as Team | undefined;
    const product = team?.product_id
      ? (products?.get(String(team.product_id)) as Product | undefined)
      : undefined;

    const program: Program = {
      id: randomUUID(),
      start: toLocalDateTime(event.attributes.start),
      end: toLocalDateTime(event.attributes.end),
      name,
      type: programType(mapped.programId, name),
      ticket: typeof product?.price === "number" ? product.price : 0,
    };

    const list = byFacility.get(mapped.facilityId);
    if (list) list.push(program);
    else byFacility.set(mapped.facilityId, [program]);
  }

  for (const programs of byFacility.values()) {
    programs.sort((a, b) => a.start.localeCompare(b.start));
  }
  return byFacility;
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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main(): Promise<void> {
  const meta = JSON.parse(
    await readFile(path.join(__dirname, "meta.json"), "utf8")
  ) as VenueMetaList;

  const venueFacilityIds = new Set<number>();
  for (const venue of meta.venues) {
    if (typeof venue.facilityId === "number") venueFacilityIds.add(venue.facilityId);
  }
  if (venueFacilityIds.size === 0) {
    throw new Error("meta.json has no venues with a facilityId.");
  }

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + LOOKAHEAD_DAYS);

  const availability = await fetchDoc<DateAvailability>("date-availabilities", {
    "page[size]": 365,
    sort: "id",
    "filter[date__gte]": dateStr(today),
    "filter[date__lte]": dateStr(endDate),
  });

  const eventFacility = collectEvents(
    availability.data.map((row) => row.attributes),
    venueFacilityIds
  );
  if (eventFacility.size === 0) {
    throw new Error(
      `No drop-in events found for facilities ${[...venueFacilityIds].join(", ")}.`
    );
  }

  const byFacility = new Map<number, Program[]>();
  for (const batch of chunk([...eventFacility.keys()], ID_BATCH_SIZE)) {
    const doc = await fetchDoc<EventAttributes>("events", {
      "page[size]": 200,
      sort: "end,start",
      include: "summary,homeTeam.product",
      "filter[id__in]": batch.join(","),
      "filter[unconstrained]": 1,
    });
    for (const [facilityId, programs] of buildPrograms(doc, eventFacility)) {
      const list = byFacility.get(facilityId);
      if (list) list.push(...programs);
      else byFacility.set(facilityId, [...programs]);
    }
  }

  const written: string[] = [];
  const skipped: string[] = [];

  for (const venue of meta.venues) {
    const programs = (
      typeof venue.facilityId === "number"
        ? byFacility.get(venue.facilityId) ?? []
        : []
    ).sort((a, b) => a.start.localeCompare(b.start));

    if (programs.length === 0) {
      skipped.push(venue.id);
      continue;
    }
    const file = await writeSchedule(venue, programs);
    written.push(venue.id);
    console.log(
      `[${venue.id}] ${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
    );
  }

  console.log(
    `[canlan] wrote ${written.length} venue(s): ${written.join(", ")}`
  );
  if (skipped.length > 0) {
    console.log(
      `[canlan] skipped ${skipped.length} venue(s) with no data: ${skipped.join(", ")}`
    );
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
