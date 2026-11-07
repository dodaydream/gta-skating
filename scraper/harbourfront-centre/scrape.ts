/**
 * Scraper for Harbourfront Centre's "Skate by the Lake" outdoor rink.
 *
 * The venue publishes a fixed weekly hours table rather than a program feed, so
 * each open day is expanded into a single "Public Skate" session from open to
 * close. It is a seasonal outdoor rink (roughly late November to late February),
 * so occurrences are limited to that window; short daily maintenance breaks are
 * ignored. Admission is always free.
 *
 * Writes out/scraped-data/harbourfront-centre.json in the shape consumed by
 * scraper/build-client-data.ts. Venue metadata lives in ./meta.json.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMeta, DayName, Program } from "../types.ts";
import { normalizeRinkType } from "../types.ts";
import { classifyProgram } from "../classify.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../out/scraped-data");

// --- Crawl settings (specific to this venue) ----------------------------

const TIMEZONE = "America/Toronto";

/** Only generate events from today through this many days out. */
const LOOKAHEAD_DAYS = 31;

/** Program label published by the venue; rink admission is always free. */
const PROGRAM_NAME = "Public Skate";

/** Seasonal window (inclusive), independent of the year. */
const SEASON_START = { month: 11, day: 20 };
const SEASON_END = { month: 2, day: 28 };

const DAYS: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// --- Fetch -------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "gta-skating-scraper/0.1 (+local dev)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// --- Parse -------------------------------------------------------------

interface RawEntry {
  day: DayName;
  startTime: string;
  endTime: string;
}

function parseDay(token: string): DayName | null {
  const base = token.toLowerCase().replace(/s$/, "");
  for (const day of DAYS) {
    if (base.startsWith(day.slice(0, 3))) return day;
  }
  return null;
}

function toHHMM(h: string, min: string | undefined, ap: string): string {
  let hour = Number.parseInt(h, 10);
  const minute = Number.parseInt(min || "0", 10);
  const isAm = ap.toLowerCase() === "am";
  if (isAm && hour === 12) hour = 0;
  if (!isAm && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "10:00am – 10:00pm" -> ["10:00", "22:00"]. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  const startAp = m[3] || m[6];
  return [toHHMM(m[1], m[2], startAp), toHHMM(m[4], m[5], m[6])];
}

/** Parse the "Rink Hours" table into one open range per weekday. */
function parseHoursTable(html: string): RawEntry[] {
  const table = html.match(
    /<table[^>]*rink-hours-table[\s\S]*?<\/table>/i
  )?.[0];
  if (!table) return [];

  const entries: RawEntry[] = [];
  for (const row of table.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&ndash;|&#8211;/g, "-")
        .replace(/&amp;/g, "&")
        .trim()
    );
    if (cells.length < 2) continue;
    const day = parseDay(cells[0]);
    if (!day) continue;
    const range = parseTimeRange(cells[1]);
    if (!range) continue;
    entries.push({ day, startTime: range[0], endTime: range[1] });
  }
  return entries;
}

// --- Expand -------------------------------------------------------------

function dateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/** True when a calendar date falls inside the seasonal window. */
function inSeason(month: number, day: number): boolean {
  if (month === SEASON_START.month) return day >= SEASON_START.day;
  if (month === SEASON_END.month) return day <= SEASON_END.day;
  // Months strictly between the start and end of the season (December, January).
  return month > SEASON_START.month || month < SEASON_END.month;
}

/** Expand the weekly hours into dated occurrences within the season + window. */
function buildPrograms(entries: RawEntry[]): Program[] {
  const byDay = new Map<DayName, RawEntry>();
  for (const entry of entries) byDay.set(entry.day, entry);

  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + LOOKAHEAD_DAYS);

  const out: Program[] = [];
  const cursor = new Date(today);
  for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!inSeason(cursor.getUTCMonth() + 1, cursor.getUTCDate())) continue;
    const entry = byDay.get(DAYS[cursor.getUTCDay()]);
    if (!entry) continue;
    const date = dateStr(cursor);
    out.push({
      id: randomUUID(),
      start: `${date}T${entry.startTime}`,
      end: `${date}T${entry.endTime}`,
      name: PROGRAM_NAME,
      type: classifyProgram(PROGRAM_NAME),
      notes: "Weather permitting",
      ticket: 0,
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

type MetaFile = VenueMeta & { name?: string };

/** Derive a display name from the config id ("harbourfront-centre" -> "Harbourfront Centre"). */
function displayName(id: string): string {
  return id
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function writeSchedule(meta: MetaFile, programs: Program[]): Promise<string> {
  const payload: Venue = {
    name: meta.name ?? displayName(meta.id),
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
  const file = path.join(OUT_DIR, `${meta.id}.json`);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return file;
}

// --- Runner -------------------------------------------------------------

async function main(): Promise<void> {
  const meta = JSON.parse(
    await readFile(path.join(__dirname, "meta.json"), "utf8")
  ) as MetaFile;

  const html = await fetchHtml(meta.url);
  const entries = parseHoursTable(html);

  if (entries.length === 0) {
    throw new Error(`No rink hours parsed for ${meta.id}.`);
  }

  const programs = buildPrograms(entries);
  const file = await writeSchedule(meta, programs);
  console.log(
    `[${meta.id}] ${entries.length} day(s) of hours, ` +
      `${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
