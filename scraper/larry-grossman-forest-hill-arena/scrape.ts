/**
 * Scraper for Larry Grossman Forest Hill Memorial Arena pleasure skating.
 *
 * Fetches the venue's Elementor/WordPress recreational-skating page, extracts
 * the recurring weekly "Pleasure Skating" hours, expands them into explicit
 * dated events for the season, and writes the result to
 * out/scraped-data/larry-grossman-forest-hill-arena.json in the shape consumed by
 * scraper/build-client-data.ts.
 *
 * Venue metadata lives in ./meta.json (generic, reusable). Anything specific to
 * this crawl (season window, timezone, walk-in price) is kept here so meta.json
 * stays metadata only.
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

/** Drop-in pleasure-skating price (CAD per person), from the venue's page. */
const TICKET = 3;

/** Program label published by the venue. */
const PROGRAM_NAME = "Pleasure Skate";

/** Fallback season window (month, day) when the page gives no range. */
const DEFAULT_SEASON = { start: [10, 1], end: [4, 30] } as const;

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

function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull the Elementor icon-list rows that hold the weekly hours. */
function extractHourItems(html: string): string[] {
  const items: string[] = [];
  const re = /<span class="elementor-icon-list-text">([\s\S]*?)<\/span>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) items.push(stripHtml(m[1]));
  return items;
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

/** "2pm - 3:50pm" / "2:15pm-4:15pm" -> ["14:00", "15:50"]. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  const startAp = m[3] || m[6];
  return [toHHMM(m[1], m[2], startAp), toHHMM(m[4], m[5], m[6])];
}

function parseItems(html: string): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const item of extractHourItems(html)) {
    const day = parseDay(item.split(/\s+/)[0]);
    if (!day) continue;
    const range = parseTimeRange(item);
    if (!range) continue;
    entries.push({ day, startTime: range[0], endTime: range[1] });
  }
  return entries;
}

/** "from October 1st - April 30th" -> [{ month, day }, { month, day }]. */
function parseSeason(
  html: string
): { start: readonly [number, number]; end: readonly [number, number] } {
  const m = html.match(
    /from\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–—]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i
  );
  if (!m) return DEFAULT_SEASON;
  const sm = MONTHS.get(m[1].toLowerCase());
  const em = MONTHS.get(m[3].toLowerCase());
  if (!sm || !em) return DEFAULT_SEASON;
  return {
    start: [sm, Number.parseInt(m[2], 10)],
    end: [em, Number.parseInt(m[4], 10)],
  };
}

// --- Expand -------------------------------------------------------------

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Resolve the season's concrete dates for the year containing today. */
function resolveSeason(season: {
  start: readonly [number, number];
  end: readonly [number, number];
}): { start: string; end: string } {
  const today = new Date();
  const [sm, sd] = season.start;
  const [em, ed] = season.end;
  const candidate = new Date(`${isoDate(today.getFullYear(), sm, sd)}T12:00:00Z`);
  const startYear =
    candidate.getTime() <= today.getTime()
      ? today.getFullYear()
      : today.getFullYear() - 1;
  return {
    start: isoDate(startYear, sm, sd),
    end: isoDate(startYear + 1, em, ed),
  };
}

/** Expand a weekly program into explicit dated occurrences within the window. */
function expandWeekly(
  entry: RawEntry,
  season: { start: string; end: string }
): string[] {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + LOOKAHEAD_DAYS);

  let start = new Date(`${season.start}T12:00:00Z`);
  const end = new Date(`${season.end}T12:00:00Z`);
  if (start < today) start = today;
  const effectiveEnd = end < windowEnd ? end : windowEnd;

  const targetIdx = DAYS.indexOf(entry.day);
  const out: string[] = [];
  const cursor = new Date(start);
  if (cursor.getUTCDay() !== targetIdx) {
    const delta = (targetIdx - cursor.getUTCDay() + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + delta);
  }
  for (; cursor <= effectiveEnd; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    out.push(dateStr(cursor));
  }
  return out;
}

function buildPrograms(
  entries: RawEntry[],
  season: { start: string; end: string }
): Program[] {
  const out: Program[] = [];
  for (const entry of entries) {
    for (const date of expandWeekly(entry, season)) {
      out.push({
        id: randomUUID(),
        start: `${date}T${entry.startTime}`,
        end: `${date}T${entry.endTime}`,
        name: PROGRAM_NAME,
        type: classifyProgram(PROGRAM_NAME),
        ticket: TICKET,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

/** Derive a display name from the config id ("larry-..." -> "Larry ..."). */
function displayName(id: string): string {
  return id
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function writeSchedule(meta: VenueMeta, programs: Program[]): Promise<string> {
  const payload: Venue = {
    name: displayName(meta.id),
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
  ) as VenueMeta;

  const html = await fetchHtml(meta.url);
  const entries = parseItems(html);

  if (entries.length === 0) {
    throw new Error(`No weekly schedule entries parsed for ${meta.id}.`);
  }

  const season = resolveSeason(parseSeason(html));
  const programs = buildPrograms(entries, season);
  const file = await writeSchedule(meta, programs);
  console.log(
    `[${meta.id}] ${entries.length} weekly program(s), ` +
      `${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
