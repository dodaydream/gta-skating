/**
 * Scraper for Town of Whitby drop-in skating (whitby.ca).
 *
 * Whitby publishes its Fall/Winter skate schedules as accordion sections, one
 * per arena, each holding a small HTML table: Day | Time | Type | Cancellations.
 * A row's Day cell can name several weekdays ("Monday, Wednesday, Friday") and
 * may carry an age qualifier ("Saturday (8-10 years)"); the Cancellations cell
 * is free text such as "December 24, 31" or "November 27, December 4, 25,
 * January 1 and March 26".  We fetch the page, parse each arena's table, expand
 * every weekly slot into explicit dated events for the season window (from the
 * accordion heading), drop the published cancellation dates, and write
 * out/scraped-data/<slug>.json in the shape consumed by scraper/build-client-data.ts.
 *
 * Admission is taken from the published Skating Fees section and keyed by
 * program name (see ticketFor).  Any specific-to-this-crawl constants (page
 * URL, fee table, generation window) live here so meta.json stays metadata only.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Venue,
  VenueMetaList,
  VenueMetaEntry,
  DayName,
  Program,
} from "../types.ts";
import { normalizeRinkType } from "../types.ts";
import { ProgramType } from "../types.ts";
import { classifyProgram } from "../classify.ts";
import { slugify } from "../../src/lib/slug.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../out/scraped-data");

const TIMEZONE = "America/Toronto";

/** Only generate events from today through this many months ahead. */
const WINDOW_MONTHS = 1;

/** Published single-use drop-in rates (CAD), 2026-27 season. */
const FEE = {
  public: 5.12,
  child: 3.42,
  fiftyFivePlusSkate: 3.42,
  stickAndPuck: 3.42,
  shinny: 5.21,
  adultShinny: 7.69,
  ladiesShinny: 7.69,
  ticketIce: 8.28,
};

const DAYS: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTHS = new Map<string, number>([
  ["january", 1],
  ["february", 2],
  ["march", 3],
  ["april", 4],
  ["may", 5],
  ["june", 6],
  ["july", 7],
  ["august", 8],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
]);

// --- Fetch -------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "gta-skating-scraper/0.1 (+local dev)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.text();
}

// --- Text helpers ------------------------------------------------------

function decodeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&ndash;|&mdash;/g, "-");
}

function toText(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

// --- Parse -------------------------------------------------------------

interface Window {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

interface ArenaSchedule {
  name: string;
  window: Window;
  html: string;
}

interface Slot {
  name: string;
  days: DayName[];
  startTime: string;
  endTime: string;
  cancelled: Set<string>;
}

function toHHMM(h: string, min: string, ap: string): string {
  let hour = Number.parseInt(h, 10);
  const minute = Number.parseInt(min || "0", 10);
  const isAm = ap.toLowerCase() === "am";
  if (isAm && hour === 12) hour = 0;
  if (!isAm && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "1:00 PM - 2:30 PM" -> ["13:00", "14:30"]. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  return [toHHMM(m[1], m[2], m[3]), toHHMM(m[4], m[5], m[6])];
}

function toDate(monthName: string, day: string, year: string): string {
  const month = MONTHS.get(monthName.toLowerCase());
  if (!month) throw new Error(`Unrecognized month: ${monthName}`);
  return `${year}-${String(month).padStart(2, "0")}-${String(
    Number.parseInt(day, 10)
  ).padStart(2, "0")}`;
}

/** Locate each arena's accordion heading, season window, and schedule table. */
function parseArenas(html: string): ArenaSchedule[] {
  const out: ArenaSchedule[] = [];
  const anchorRe =
    /<a\b[^>]*href="#(collapse_[^"]+)"[^>]*name="Fall\/WinterSkateSchedule-[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const collapseId = m[1];
    const heading = toText(m[2]);
    const parsed = heading.match(
      /Skate Schedule\s*-\s*(.+?)\s*\(([\s\S]*?)\)\s*-\s*([A-Za-z]+ \d{1,2}, \d{4})\s*-\s*([A-Za-z]+ \d{1,2}, \d{4})/i
    );
    if (!parsed) continue;
    const startM = parsed[3].match(/([A-Za-z]+) (\d{1,2}), (\d{4})/);
    const endM = parsed[4].match(/([A-Za-z]+) (\d{1,2}), (\d{4})/);
    if (!startM || !endM) continue;

    const marker = html.indexOf(`id="${collapseId}"`);
    if (marker < 0) continue;
    const table = /<table\b[\s\S]*?<\/table>/i.exec(html.slice(marker))?.[0];
    if (!table) continue;

    out.push({
      name: parsed[1].trim(),
      window: {
        start: toDate(startM[1], startM[2], startM[3]),
        end: toDate(endM[1], endM[2], endM[3]),
      },
      html: table,
    });
  }
  return out;
}

/** Parse a "December 24, 31" / "November 27 and March 26" list into dates. */
function parseCancellations(cell: string, window: Window): Set<string> {
  const out = new Set<string>();
  const startYear = Number(window.start.slice(0, 4));
  const startMonth = Number(window.start.slice(5, 7));
  const endYear = Number(window.end.slice(0, 4));

  let month: number | null = null;
  const parts = cell.split(/,|\band\b/i).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const withMonth = part.match(/^([A-Za-z]+)\s*(\d{1,2})?$/);
    if (withMonth) {
      const parsed = MONTHS.get(withMonth[1].toLowerCase());
      if (!parsed) continue;
      month = parsed;
      if (withMonth[2]) add(parsed, withMonth[2]);
      continue;
    }
    const bare = part.match(/^(\d{1,2})$/);
    if (bare && month) add(month, bare[1]);
  }

  function add(mon: number, day: string): void {
    const year = mon >= startMonth ? startYear : endYear;
    out.add(
      `${year}-${String(mon).padStart(2, "0")}-${String(
        Number.parseInt(day, 10)
      ).padStart(2, "0")}`
    );
  }

  return out;
}

/** Turn one arena's schedule table into weekly slots. */
function parseSlots(tableHtml: string, window: Window): Slot[] {
  const slots: Slot[] = [];
  const rows = [...tableHtml.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((r) => r[0]);
  for (const row of rows) {
    const cells = [...row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(
      (c) => toText(c[1])
    );
    // Group header rows span the table with a single cell.
    if (cells.length < 3) continue;

    const range = parseTimeRange(cells[1] ?? "");
    if (!range) continue; // the "Day | Time | Type | Cancellations" header row.

    const days = DAYS.filter((d) =>
      new RegExp(`\\b${d}\\b`, "i").test(cells[0])
    );
    if (days.length === 0) continue;

    const qualifier = cells[0].match(/\(([^)]*)\)/)?.[1];
    let name = (cells[2] ?? "").trim() || (cells[0] ?? "").trim();
    if (/^recreational$/i.test(name)) name = "Recreational Public Skate";
    if (qualifier && /(stick and puck|shinny)/i.test(name)) {
      name = `${name} (${qualifier})`;
    }

    slots.push({
      name,
      days,
      startTime: range[0],
      endTime: range[1],
      cancelled: parseCancellations(cells[3] ?? "", window),
    });
  }
  return slots;
}

// --- Fees --------------------------------------------------------------

function ticketFor(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("ticket ice")) return FEE.ticketIce;
  if (lower.includes("shinny")) {
    if (lower.includes("adult")) return FEE.adultShinny;
    if (lower.includes("ladies")) return FEE.ladiesShinny;
    if (lower.includes("55+")) return FEE.shinny;
    if (lower.includes("youth")) return FEE.shinny;
    return FEE.shinny;
  }
  if (lower.includes("stick")) return FEE.stickAndPuck;
  if (lower.includes("55+")) return FEE.fiftyFivePlusSkate;
  if (lower.includes("parent")) return FEE.public;
  // Public/family/adult/child drop-ins and sledge hockey use the adult single
  // public-skate rate.
  return FEE.public;
}

/** The venue's own program name already reads well; ticket ice is figure skating. */
function typeFor(name: string): ProgramType {
  if (name.toLowerCase().includes("ticket ice")) return ProgramType.FigureSkating;
  if (name.toLowerCase().includes("sledge")) return ProgramType.PickupHockey;
  return classifyProgram(name);
}

// --- Expand ------------------------------------------------------------

function dateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date()
  );
}

/** Expand one weekday into dated occurrences within the season + rolling window. */
function expandWeekly(day: DayName, window: Window, cancelled: Set<string>): string[] {
  const today = new Date(`${todayStr()}T12:00:00Z`);
  const windowEnd = new Date(today);
  windowEnd.setUTCMonth(windowEnd.getUTCMonth() + WINDOW_MONTHS);

  let start = new Date(`${window.start}T12:00:00Z`);
  if (start < today) start = today;
  const end = new Date(`${window.end}T12:00:00Z`);
  const effectiveEnd = end < windowEnd ? end : windowEnd;

  const targetIdx = DAYS.indexOf(day);
  const cursor = new Date(start);
  if (cursor.getUTCDay() !== targetIdx) {
    cursor.setUTCDate(cursor.getUTCDate() + ((targetIdx - cursor.getUTCDay() + 7) % 7));
  }

  const out: string[] = [];
  for (; cursor <= effectiveEnd; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const ds = dateStr(cursor);
    if (cancelled.has(ds)) continue;
    out.push(ds);
  }
  return out;
}

// --- Runner ------------------------------------------------------------

async function main(): Promise<void> {
  const meta = JSON.parse(
    await readFile(path.join(__dirname, "meta.json"), "utf8")
  ) as VenueMetaList;

  const html = await fetchHtml(meta.venues[0].url);
  const arenas = parseArenas(html);
  if (arenas.length === 0) {
    throw new Error("No Whitby skate-schedule accordions parsed from the page.");
  }

  const programsByArena = new Map<string, Program[]>();
  for (const arena of arenas) {
    const programs = programsByArena.get(arena.name) ?? [];
    for (const slot of parseSlots(arena.html, arena.window)) {
      const ticket = ticketFor(slot.name);
      const type = typeFor(slot.name);
      for (const day of slot.days) {
        for (const date of expandWeekly(day, arena.window, slot.cancelled)) {
          programs.push({
            id: randomUUID(),
            start: `${date}T${slot.startTime}`,
            end: `${date}T${slot.endTime}`,
            name: slot.name,
            type,
            ticket,
          });
        }
      }
    }
    programs.sort((a, b) => a.start.localeCompare(b.start));
    programsByArena.set(arena.name, programs);
  }

  const written: string[] = [];
  const skipped: string[] = [];
  for (const venue of meta.venues) {
    const programs = programsByArena.get(venue.name) ?? [];
    if (programs.length === 0) {
      skipped.push(venue.id);
      continue;
    }
    await writeSchedule(venue, programs);
    written.push(venue.id);
    console.log(
      `[whitby-ca] ${venue.name}: ${programs.length} program(s) -> ` +
        `out/scraped-data/${slugify(venue.name)}.json`
    );
  }

  console.log(
    `[whitby-ca] wrote ${written.length} venue(s): ${written.join(", ")}`
  );
  if (skipped.length > 0) {
    console.log(
      `[whitby-ca] skipped ${skipped.length} venue(s) with no data: ${skipped.join(", ")}`
    );
  }
}

async function writeSchedule(
  venue: VenueMetaEntry,
  programs: Program[]
): Promise<string> {
  const payload: Venue = {
    name: venue.name,
    url: venue.url,
    timezone: TIMEZONE,
    address: venue.address,
    type: normalizeRinkType(venue.type),
    coordinates: venue.coordinates,
    rinks: venue.rinks,
    amenities: venue.amenities,
    info: venue.info,
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

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
