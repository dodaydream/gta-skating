/**
 * Scraper for City of Mississauga drop-in skating (ActiveNet / ActiveCommunities).
 *
 * Mississauga publishes its drop-in calendars through the ActiveNet REST API
 * used by the web calendar at
 * https://anc.ca.apm.activecommunities.com/activemississauga/calendars
 *
 * We mirror the calendar's own request:
 *
 *   POST /activemississauga/rest/onlinecalendar/multicenter/events
 *   { calendar_id, center_ids, display_all, activity_category_ids }
 *
 * `activity_category_ids: [52]` is the Skating category, so the response holds
 * every skating drop-in (public/fun skate, shinny, stick & puck, figure skating
 * and skate fit) at the centers listed in ./meta.json, grouped by center. Each
 * center with data is written to src/data/<slug>.json in the shape consumed by
 * src/data/schedules.ts; centers with no data in the window are skipped so we
 * never emit an empty schedule.
 *
 * Ticket prices come from the published 2026 admission rates (effective
 * 2026-04-01 to 2027-03-31). The schema carries a single price, so the Adult
 * (18+) single-visit rate is used. Programs the API flags as free (and titles
 * that say "free") are written as $0.
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

/** ActiveNet tenant REST base and the calendar holding drop-in programs. */
const API_BASE =
  "https://anc.ca.apm.activecommunities.com/activemississauga/rest";
const CALENDAR_ID = 1;

/** ActiveNet activity category id for Skating. */
const SKATING_CATEGORY_ID = 52;

/** display_all value that returns every event in the selected categories. */
const DISPLAY_ALL = 0;

/**
 * Published single-visit Adult (18+) drop-in rates (CAD), 2026 admission
 * schedule. The schema has one price per program, so the adult rate is used;
 * shinny is tiered by age in the published table.
 */
const SWIM_SKATE_FEE = 4.61;
const SHINNY_ADULT_FEE = 6.96;
const SHINNY_YOUTH_FEE = 3.71;
const SHINNY_OLDER_ADULT_FEE = 5.56;
const STICK_AND_PUCK_FEE = 3.98;
const SKATE_FIT_FEE = 17.22;

// --- API shapes --------------------------------------------------------

interface ApiEvent {
  title: string;
  start_time: string;
  end_time: string;
  event_item_id: number;
  price?: { free?: boolean };
}

interface CenterEvents {
  center_id: number;
  center_name: string;
  events: ApiEvent[];
}

interface EventsResponse {
  headers?: { response_code?: string; response_message?: string };
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
      activity_category_ids: [SKATING_CATEGORY_ID],
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

/** The venue's published program name, without the redundant "Drop In" prefix. */
function displayName(title: string): string {
  return title.replace(/^drop\s*in\s+/i, "").trim() || title.trim();
}

/** Drop-in price (CAD) for a program, from its published title. */
function ticketFor(title: string): number {
  const lower = title.toLowerCase();
  if (lower.includes("skate fit")) return SKATE_FIT_FEE;
  if (lower.includes("stick & puck") || lower.includes("stick and puck")) {
    return STICK_AND_PUCK_FEE;
  }
  if (lower.includes("shinny")) {
    if (/\b13\s*-\s*17\b|youth/.test(lower)) return SHINNY_YOUTH_FEE;
    if (/55\+|65\+|older adult/.test(lower)) return SHINNY_OLDER_ADULT_FEE;
    return SHINNY_ADULT_FEE;
  }
  // Public/fun skate, youth skate and figure skating all use the Swim/Skate rate.
  return SWIM_SKATE_FEE;
}

function isFree(event: ApiEvent): boolean {
  return event.price?.free === true || /\bfree\b/i.test(event.title);
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
      ticket: isFree(event) ? 0 : ticketFor(event.title),
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
      `[${venue.id}] ${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
    );
  }

  console.log(
    `[mississauga-ca] wrote ${written.length} venue(s): ${written.join(", ")}`
  );
  if (skipped.length > 0) {
    console.log(
      `[mississauga-ca] skipped ${skipped.length} venue(s) with no data: ${skipped.join(", ")}`
    );
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
