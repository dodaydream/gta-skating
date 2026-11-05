/**
 * Scraper for Town of Whitchurch-Stouffville drop-in skating
 * (ActiveNet / ActiveCommunities, tenant "townofws").
 *
 * The town publishes its drop-in skating calendar through the ActiveNet REST
 * API used by the web calendar at
 * https://anc.ca.apm.activecommunities.com/townofws/calendars (calendar id 3).
 *
 * We mirror the calendar's own request:
 *
 *   POST /townofws/rest/onlinecalendar/multicenter/events
 *   { calendar_id, center_ids, display_all }
 *
 * The skating calendar holds public/family/adult skates, parent-and-tot,
 * shinny and stick & puck, grouped by center.  Each center with data is written
 * to src/data/<slug>.json in the shape consumed by src/data/schedules.ts;
 * centers with no data in the window are skipped so we never emit an empty
 * schedule.
 *
 * Ticket prices come from the town's published Fall 2026 drop-in fee table
 * (prices include HST, single-use).  The schema carries a single price, so the
 * rate for the program's participant category is used.  The API carries no
 * per-event price, and the town does not publish any free skating drop-ins.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMetaList, Program } from "../types.ts";
import { classifyProgram } from "../classify.ts";
import { slugify } from "../../src/lib/slug.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../src/data");

const TIMEZONE = "America/Toronto";

/** ActiveNet tenant REST base and the skating calendar id. */
const API_BASE =
  "https://anc.ca.apm.activecommunities.com/townofws/rest";
const CALENDAR_ID = 3;

/** display_all value that returns every event in the selected centers. */
const DISPLAY_ALL = 0;

/** Published single-use drop-in rates (CAD, HST included), Fall 2026. */
const FEE = {
  totSkate: 2.5,
  adultSkate: 5.5,
  youthShinny: 5.5,
  adultShinny: 7.5,
  familyStickAndPuck: 17.5,
};

// --- API shapes --------------------------------------------------------

interface ApiEvent {
  title: string;
  start_time: string;
  end_time: string;
  event_item_id: number;
}

interface CenterEvents {
  center_id: number;
  center_name: string;
  events: ApiEvent[];
}

interface EventsResponse {
  body: { center_events: CenterEvents[] };
}

// --- Fetch -------------------------------------------------------------

async function fetchEvents(centerIds: number[]): Promise<CenterEvents[]> {
  const url = `${API_BASE}/onlinecalendar/multicenter/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "gta-skating-scraper/0.1 (+local dev)",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      calendar_id: CALENDAR_ID,
      center_ids: centerIds,
      display_all: DISPLAY_ALL,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status} ${res.statusText}`);
  const doc = (await res.json()) as EventsResponse;
  return doc.body?.center_events ?? [];
}

// --- Parse -------------------------------------------------------------

/** "2026-11-04 09:15:00" -> "2026-11-04T09:15". */
function toLocalDateTime(value: string): string {
  return value.slice(0, 16).replace(" ", "T");
}

/** "2026-11-04 09:15:00" -> "2026-11-04". */
function toDate(value: string): string {
  return value.slice(0, 10);
}

function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date()
  );
}

/** The program name without the town's "TOWS"/"Hockey" feed prefixes. */
function displayName(title: string): string {
  return title.replace(/^(?:tows|hockey)\s*-\s*/i, "").trim() || title.trim();
}

/** Single-use drop-in price (CAD) for a program, from the published fee table. */
function ticketFor(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("parent") && lower.includes("tot")) return FEE.totSkate;
  if (lower.includes("stick")) return FEE.familyStickAndPuck;
  if (lower.includes("shinny")) {
    if (lower.includes("adult") || lower.includes("senior")) {
      return FEE.adultShinny;
    }
    return FEE.youthShinny;
  }
  // Public skate and adult/senior leisure skate use the adult skate rate.
  return FEE.adultSkate;
}

/** Turn one center's events into programs, dropping anything already ended. */
function buildPrograms(events: ApiEvent[]): Program[] {
  const today = todayStr();
  const seen = new Set<string>();
  const out: Program[] = [];

  for (const event of events) {
    if (event.end_time && toDate(event.end_time) < today) continue;
    // event_item_id is shared by every occurrence of a recurring program, so
    // key on the occurrence itself to keep one program per date/time.
    const key = `${event.event_item_id}|${event.start_time}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = displayName(event.title);
    out.push({
      id: randomUUID(),
      start: toLocalDateTime(event.start_time),
      end: toLocalDateTime(event.end_time),
      name,
      type: classifyProgram(name),
      ticket: ticketFor(name),
    });
  }

  return out.sort((a, b) => a.start.localeCompare(b.start));
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
    rinks: meta.rinks,
    amenities: meta.amenities,
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

  const centerIds = meta.venues
    .map((venue) => venue.centerId)
    .filter((id): id is number => typeof id === "number");
  if (centerIds.length === 0) {
    throw new Error("meta.json has no venues with a centerId.");
  }

  const centers = await fetchEvents(centerIds);
  const eventsByCenter = new Map<number, ApiEvent[]>();
  for (const center of centers) {
    eventsByCenter.set(center.center_id, center.events ?? []);
  }

  const written: string[] = [];
  const skipped: string[] = [];

  for (const venue of meta.venues) {
    const events =
      typeof venue.centerId === "number"
        ? eventsByCenter.get(venue.centerId) ?? []
        : [];
    const programs = buildPrograms(events);
    if (programs.length === 0) {
      skipped.push(venue.id);
      continue;
    }
    const file = await writeSchedule(venue, programs);
    written.push(venue.id);
    console.log(
      `[townofws-ca] ${venue.id}: ${programs.length} program(s) -> ` +
        path.relative(process.cwd(), file)
    );
  }

  console.log(
    `[townofws-ca] wrote ${written.length} venue(s): ${written.join(", ")}`
  );
  if (skipped.length > 0) {
    console.log(
      `[townofws-ca] skipped ${skipped.length} venue(s) with no data: ${skipped.join(", ")}`
    );
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
