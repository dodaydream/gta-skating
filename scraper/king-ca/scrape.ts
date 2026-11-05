/**
 * Scraper for Township of King drop-in skating (PerfectMind / BookMe4).
 *
 * King publishes its drop-in skating calendar through the PerfectMind BookMe4
 * widget.  The calendar is rendered client-side: the Classes page embeds an
 * ASP.NET anti-forgery token, and the grid is then filled by POSTing that token
 * to the widget's ClassesV2 endpoint:
 *
 *   POST /Clients/BookMe4BookingPagesV2/ClassesV2
 *   { calendarId, widgetId, page, dateString, values, after,
 *     __RequestVerificationToken }
 *
 * The response is cursor-paginated: each page returns `classes` plus a
 * `nextKey` cursor that is echoed back as `after` for the next page.  We keep
 * paging until `nextKey` is the minimum-date sentinel.
 *
 * Every class carries its own Location, so the single feed is grouped by
 * location and matched to the venue list in ./meta.json (the venue list follows
 * the same shape as the other multi-venue scrapers).  Each venue with data is
 * written to src/data/<slug>.json in the shape consumed by
 * src/data/schedules.ts; venues with no data are skipped so we never emit an
 * empty schedule.
 *
 * The feed reports price as a range (e.g. "$0.00 - $9.00").  The lower bound is
 * the free rate (children, 55+, adaptive skaters) and the upper bound is the
 * standard participant rate for the program, so the schema's single price is
 * the range maximum.  "No fee" programs are written as $0.
 *
 * King nests its BookMe4 widget under a tenant path segment (/23793), which the
 * API endpoint must include; the calendar widget settings are kept here so
 * meta.json stays metadata only.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMetaList, VenueMetaEntry, Program } from "../types.ts";
import { classifyProgram } from "../classify.ts";
import { slugify } from "../../src/lib/slug.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../src/data");

const TIMEZONE = "America/Toronto";

/** PerfectMind BookMe4 calendar widget holding the Township of King "Skating" calendar. */
const ORIGIN = "https://townshipofking.perfectmind.com";
const TENANT = "/23793";
const BOOKING_URL = `${ORIGIN}${TENANT}/Clients/BookMe4BookingPages/Classes`;
const CALENDAR_ID = "2fd6d540-75aa-416b-9a70-a78b8f598e7d";
const WIDGET_ID = "15f6af07-39c5-473e-b053-96653f77a406";

/** Stop paging if the cursor never terminates (defensive bound). */
const MAX_PAGES = 100;

const UA = "gta-skating-scraper/0.1 (+local dev)";

// --- API shapes --------------------------------------------------------

interface ApiClass {
  EventId: string;
  EventName: string;
  OccurrenceDate: string; // "20261104"
  FormattedStartTime: string; // "07:05 PM"
  FormattedEndTime: string; // "08:30 PM"
  PriceRange: string; // "$0.00 - $9.00" | "No fee"
  Location: string;
}

interface ClassesResponse {
  classes: ApiClass[];
  nextKey: string | null;
}

// --- Fetch -------------------------------------------------------------

interface Session {
  token: string;
  cookie: string;
}

/** Load the Classes page and read its anti-forgery token and session cookie. */
async function openSession(): Promise<Session> {
  const url = `${BOOKING_URL}?calendarId=${CALENDAR_ID}&widgetId=${WIDGET_ID}&embed=False`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  const html = await res.text();

  const token = html.match(
    /__RequestVerificationToken" type="hidden" value="([^"]+)"/
  )?.[1];
  if (!token) {
    throw new Error("Anti-forgery token not found on the Classes page.");
  }

  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");

  return { token, cookie };
}

/** Fetch one page of classes, following the cursor with `after`. */
async function fetchPage(session: Session, after: string): Promise<ClassesResponse> {
  const url = `${ORIGIN}${TENANT}/Clients/BookMe4BookingPagesV2/ClassesV2`;
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
  };
  if (session.cookie) headers.Cookie = session.cookie;

  const body = new URLSearchParams({
    calendarId: CALENDAR_ID,
    widgetId: WIDGET_ID,
    page: "0",
    dateString: "",
    after,
    __RequestVerificationToken: session.token,
  });

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status} ${res.statusText}`);
  const doc = (await res.json()) as ClassesResponse;
  return { classes: doc.classes ?? [], nextKey: doc.nextKey ?? null };
}

/** Follow the cursor until the feed is exhausted. */
async function fetchAllClasses(): Promise<ApiClass[]> {
  const session = await openSession();
  const out: ApiClass[] = [];
  let after = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const doc = await fetchPage(session, after);
    out.push(...doc.classes);
    // The stop cursor is either empty or the minimum date sentinel.
    if (
      doc.classes.length === 0 ||
      !doc.nextKey ||
      doc.nextKey.startsWith("0001-01-01")
    ) {
      break;
    }
    after = doc.nextKey;
  }
  return out;
}

// --- Parse -------------------------------------------------------------

/** "20261104" -> "2026-11-04". */
function toDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** "07:05 PM" -> "19:05", "08:30 AM" -> "08:30". */
function toHHMM(value: string): string {
  const m = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) throw new Error(`Unrecognized time: ${value}`);
  let hour = Number.parseInt(m[1], 10);
  const minute = m[2];
  const isPm = m[3].toUpperCase() === "PM";
  if (isPm && hour !== 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

/** Add `days` to a "YYYY-MM-DD" date string. */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Standard participant rate (CAD); "No fee" programs are free. */
function ticketFor(priceRange: string): number {
  if (/no fee|free/i.test(priceRange)) return 0;
  const amounts = [...priceRange.matchAll(/\$([\d.]+)/g)].map((m) =>
    Number.parseFloat(m[1])
  );
  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

/** Trim the venue's padding and collapse the runs of whitespace it emits. */
function displayName(eventName: string): string {
  return eventName.replace(/\s+/g, " ").trim();
}

function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date()
  );
}

// --- Build -------------------------------------------------------------

/** Turn the flat class list into programs, grouped by their Location name. */
function buildPrograms(classes: ApiClass[]): Map<string, Program[]> {
  const today = todayStr();
  const byLocation = new Map<string, Program[]>();
  const seen = new Set<string>();

  for (const item of classes) {
    if (!item.Location || !item.OccurrenceDate) continue;

    const date = toDate(item.OccurrenceDate);
    const startTime = toHHMM(item.FormattedStartTime);
    const endTime = toHHMM(item.FormattedEndTime);
    // A program ending at or before its start crosses midnight.
    const endDate = endTime <= startTime ? addDays(date, 1) : date;
    const end = `${endDate}T${endTime}`;
    if (end < today) continue;

    const key = `${item.EventId}|${date}|${startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = displayName(item.EventName);
    const programs = byLocation.get(item.Location) ?? [];
    programs.push({
      id: randomUUID(),
      start: `${date}T${startTime}`,
      end,
      name,
      type: classifyProgram(name),
      ticket: ticketFor(item.PriceRange),
    });
    byLocation.set(item.Location, programs);
  }

  for (const programs of byLocation.values()) {
    programs.sort((a, b) => a.start.localeCompare(b.start));
  }
  return byLocation;
}

// --- Write -------------------------------------------------------------

async function writeSchedule(
  venue: VenueMetaEntry,
  programs: Program[]
): Promise<string> {
  const payload: Venue = {
    name: venue.name,
    url: venue.url,
    timezone: TIMEZONE,
    address: venue.address,
    coordinates: venue.coordinates,
    schedule: {
      updatedAt: new Date().toISOString(),
      programs,
    },
  };
  const file = path.join(OUT_DIR, `${slugify(venue.name)}.json`);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return file;
}

// --- Runner ------------------------------------------------------------

async function main(): Promise<void> {
  const meta = JSON.parse(
    await readFile(path.join(__dirname, "meta.json"), "utf8")
  ) as VenueMetaList;

  const classes = await fetchAllClasses();
  if (classes.length === 0) {
    throw new Error("No classes returned for the Township of King skating calendar.");
  }
  const byLocation = buildPrograms(classes);

  const written: string[] = [];
  const skipped: string[] = [];

  for (const venue of meta.venues) {
    const programs = byLocation.get(venue.name) ?? [];
    if (programs.length === 0) {
      skipped.push(venue.id);
      continue;
    }
    const file = await writeSchedule(venue, programs);
    written.push(venue.id);
    console.log(
      `[king-ca] ${venue.name}: ${programs.length} program(s) -> ` +
        path.relative(process.cwd(), file)
    );
  }

  console.log(
    `[king-ca] ${classes.length} class(es), wrote ${written.length} venue(s): ` +
      written.join(", ")
  );
  if (skipped.length > 0) {
    console.log(
      `[king-ca] skipped ${skipped.length} venue(s) with no data: ${skipped.join(", ")}`
    );
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
