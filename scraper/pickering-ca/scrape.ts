/**
 * Scraper for City of Pickering drop-in skating (pickering.ca).
 *
 * Unlike the feed-based scrapers, Pickering publishes its skating schedule as a
 * static seasonal web page: a headline date range per program type and a small
 * HTML table per arena listing the recurring weekly times, plus prose
 * cancellation dates.  We fetch the page, parse those tables and date ranges,
 * expand each weekly slot into explicit dated events for the season, drop the
 * published cancellation dates, and write src/data/<slug>.json in the shape
 * consumed by src/data/schedules.ts.
 *
 * Any specific-to-this-crawl constants (page URL, shinny admission) live here
 * so meta.json stays metadata only.
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
import { classifyProgram } from "../classify.ts";
import { slugify } from "../../src/lib/slug.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../src/data");

const TIMEZONE = "America/Toronto";

/** Season shinny admission (CAD); all other Pickering drop-ins are free. */
const SHINNY_FEE = 5.15;

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
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/&#x2B;/g, "+");
}

/** Flatten a markup fragment to normalized text. */
function toText(raw: string): string {
  return decodeEntities(raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

// --- Parse tables ------------------------------------------------------

interface WeeklySlot {
  name: string;
  day: DayName;
  startTime: string;
  endTime: string;
}

interface ArenaTable {
  arena: string;
  slots: WeeklySlot[];
}

function parseDay(text: string): DayName | null {
  const first = text.toLowerCase().split(/\s+/)[0];
  return (DAYS as string[]).includes(first) ? (first as DayName) : null;
}

function toHHMM(h: string, min: string, ap: string): string {
  let hour = Number.parseInt(h, 10);
  const minute = Number.parseInt(min || "0", 10);
  const isAm = ap.toLowerCase() === "am";
  if (isAm && hour === 12) hour = 0;
  if (!isAm && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "11:00 am - 1:00 pm" -> ["11:00", "13:00"]. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  return [toHHMM(m[1], m[2], m[3]), toHHMM(m[4], m[5], m[6])];
}

/** Parse the schedule tables out of the page. */
function parseTables(html: string): ArenaTable[] {
  const out: ArenaTable[] = [];
  const tableRe = /<table\b[\s\S]*?<\/table>/gi;
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(html)) !== null) {
    const rows = [...m[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((r) => r[0]);
    if (rows.length < 3) continue;

    const cells = (row: string): string[] =>
      [...row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) =>
        toText(c[1])
      );

    const header = cells(rows[1]);
    // Schedule tables carry a "FALL" band row; the facilities info table does not.
    if (header[0] !== "FALL") continue;

    const arena = cells(rows[0])[0];
    if (!arena) continue;

    const columns = header.slice(1);
    const slots: WeeklySlot[] = [];
    for (let i = 2; i < rows.length; i++) {
      const c = cells(rows[i]);
      const day = parseDay(c[0] ?? "");
      if (!day) continue;
      for (let j = 1; j < c.length && j <= columns.length; j++) {
        const time = c[j];
        if (!time || /^na$/i.test(time)) continue;
        const range = parseTimeRange(time);
        if (!range) continue;
        slots.push({
          name: columns[j - 1],
          day,
          startTime: range[0],
          endTime: range[1],
        });
      }
    }
    out.push({ arena, slots });
  }
  return out;
}

// --- Parse date ranges -------------------------------------------------

interface Window {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/** "September 8" -> "2026-09-08" using the given year. */
function toDate(monthName: string, day: string, year: string): string {
  const month = MONTHS.get(monthName.toLowerCase());
  if (!month) throw new Error(`Unrecognized month: ${monthName}`);
  const dd = String(Number.parseInt(day, 10)).padStart(2, "0");
  return `${year}-${String(month).padStart(2, "0")}-${dd}`;
}

/** Parse "September 8 - December 18, 2026" -> { start, end }. */
function parseWindow(raw: string | undefined): Window | null {
  if (!raw) return null;
  const m = raw.match(
    /([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/
  );
  if (!m) return null;
  return {
    start: toDate(m[1], m[2], m[5]),
    end: toDate(m[3], m[4], m[5]),
  };
}

/** Parse a "Oct 10, Nov 7, Dec 5" list into dated strings for the given year. */
function parseDateList(raw: string | undefined, year: string): Set<string> {
  const out = new Set<string>();
  if (!raw) return out;
  for (const m of raw.matchAll(/([A-Z][a-z]{2})\s+(\d{1,2})/g)) {
    const month = MONTHS.get(
      [...MONTHS.keys()].find((k) => k.startsWith(m[1].toLowerCase())) ?? ""
    );
    if (!month) continue;
    const dd = String(Number.parseInt(m[2], 10)).padStart(2, "0");
    out.add(`${year}-${String(month).padStart(2, "0")}-${dd}`);
  }
  return out;
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

/** Expand one weekly slot into explicit dated occurrences within its window. */
function expandWeekly(slot: WeeklySlot, window: Window, cancelled: Set<string>): string[] {
  const today = todayStr();
  const start = window.start < today ? today : window.start;

  const targetIdx = DAYS.indexOf(slot.day);
  const cursor = new Date(`${start}T12:00:00Z`);
  if (cursor.getUTCDay() !== targetIdx) {
    cursor.setUTCDate(cursor.getUTCDate() + ((targetIdx - cursor.getUTCDay() + 7) % 7));
  }

  const end = new Date(`${window.end}T12:00:00Z`);
  const out: string[] = [];
  for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const ds = dateStr(cursor);
    if (cancelled.has(ds)) continue;
    out.push(ds);
  }
  return out;
}

// --- Build -------------------------------------------------------------

const DISPLAY_NAMES: Record<string, string> = {
  "Daytime Skate": "Daytime Skate",
  "Public Skate": "Public Skate",
  "P&C Skate": "Parent & Child Skate",
  "P&C Stick & Puck": "Parent & Child Stick & Puck",
  "Shinny Hockey": "Shinny Hockey",
};

function programName(raw: string): string {
  return DISPLAY_NAMES[raw] ?? raw;
}

async function main(): Promise<void> {
  const meta = JSON.parse(
    await readFile(path.join(__dirname, "meta.json"), "utf8")
  ) as VenueMetaList;

  const html = await fetchHtml(meta.venues[0].url);
  const text = toText(html);

  const publicWindow = parseWindow(
    text.match(/Public Skating:\s*([A-Za-z]+ \d{1,2}\s*[-–]\s*[A-Za-z]+ \d{1,2},\s*\d{4})/)?.[1]
  );
  const daytimeWindow = parseWindow(
    text.match(/Daytime Skating:\s*([A-Za-z]+ \d{1,2}\s*[-–]\s*[A-Za-z]+ \d{1,2},\s*\d{4})/)?.[1]
  );
  const pcWindow = parseWindow(
    text.match(/Parent & Child \/ Stick & Puck:\s*([A-Za-z]+ \d{1,2}\s*[-–]\s*[A-Za-z]+ \d{1,2},\s*\d{4})/)?.[1]
  );
  const shinnyWindow = parseWindow(
    text.match(/DATES:\s*([A-Za-z]+ \d{1,2}\s*[-–]\s*[A-Za-z]+ \d{1,2},\s*\d{4})/)?.[1]
  );
  if (!publicWindow || !daytimeWindow || !pcWindow || !shinnyWindow) {
    throw new Error("Could not parse the Pickering season date ranges.");
  }
  const year = publicWindow.end.slice(0, 4);

  const chdCancel = parseDateList(
    text.match(/CHD Rec Complex\s*[-–]\s*((?:[A-Z][a-z]{2}\s+\d{1,2},?\s*)+)/)?.[1],
    year
  );
  const donCancel = parseDateList(
    text.match(/Don Beer Arena\s*[-–]\s*((?:[A-Z][a-z]{2}\s+\d{1,2},?\s*)+)/)?.[1],
    year
  );
  const daytimeCancel = parseDateList(
    text.match(/Daytime Skating:\s*((?:[A-Z][a-z]{2}\s+\d{1,2},?\s*)+)/)?.[1],
    year
  );
  const pcCancel = parseDateList(
    text.match(/Parent & Child \/ Stick & Puck:\s*((?:[A-Z][a-z]{2}\s+\d{1,2},?\s*)+)/)?.[1],
    year
  );
  const shinnyCancel = parseDateList(
    text.match(/Shinny Hockey:\s*Don Beer Arena\s*[-–]\s*((?:[A-Z][a-z]{2}\s+\d{1,2},?\s*)+)/)?.[1],
    year
  );

  const tables = parseTables(html);
  if (tables.length === 0) {
    throw new Error("No schedule tables parsed from the Pickering page.");
  }

  const programsByArena = new Map<string, Program[]>();
  for (const table of tables) {
    const programs = programsByArena.get(table.arena) ?? [];
    for (const slot of table.slots) {
      const lower = slot.name.toLowerCase();
      let window: Window;
      let ticket: number;
      let cancelled: Set<string>;
      if (lower.includes("shinny")) {
        window = shinnyWindow;
        ticket = SHINNY_FEE;
        cancelled = shinnyCancel;
      } else if (lower.includes("daytime")) {
        window = daytimeWindow;
        ticket = 0;
        cancelled = daytimeCancel;
      } else if (lower.includes("stick") || lower.includes("p&c") || lower.includes("parent")) {
        window = pcWindow;
        ticket = 0;
        cancelled = pcCancel;
      } else {
        window = publicWindow;
        ticket = 0;
        cancelled = table.arena.includes("Don Beer") ? donCancel : chdCancel;
      }

      const name = programName(slot.name);
      for (const date of expandWeekly(slot, window, cancelled)) {
        programs.push({
          id: randomUUID(),
          start: `${date}T${slot.startTime}`,
          end: `${date}T${slot.endTime}`,
          name,
          type: classifyProgram(name),
          ticket,
        });
      }
    }
    programs.sort((a, b) => a.start.localeCompare(b.start));
    programsByArena.set(table.arena, programs);
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
      `[pickering-ca] ${venue.name}: ${programs.length} program(s) -> ` +
        `src/data/${slugify(venue.name)}.json`
    );
  }

  console.log(
    `[pickering-ca] wrote ${written.length} venue(s): ${written.join(", ")}`
  );
  if (skipped.length > 0) {
    console.log(
      `[pickering-ca] skipped ${skipped.length} venue(s) with no data: ${skipped.join(", ")}`
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
    coordinates: venue.coordinates,
    rinks: venue.rinks,
    amenities: venue.amenities,
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
