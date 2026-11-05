/**
 * Scraper for Moss Park Arena free public skating.
 *
 * Fetches the venue's WordPress public-skating page, extracts the recurring
 * weekly programs, expands them into explicit dated events for the season, and
 * writes the result to src/data/moss-park-arena.json in the shape consumed by
 * src/data/schedule.ts.
 *
 * Venue metadata lives in ./meta.json (generic, reusable). Anything specific to
 * this crawl (season window, timezone) is kept here so meta.json stays metadata
 * only.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMeta, DayName, Program } from "../types.ts";
import { classifyProgram } from "../classify.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../src/data");

// --- Crawl settings (specific to this venue) ----------------------------

const TIMEZONE = "America/Toronto";

/** Ontario statutory holidays the venue closes on. */
const STAT_HOLIDAYS = new Set<string>([
  "2026-01-01",
  "2026-02-16",
  "2026-04-03",
  "2026-05-18",
  "2026-07-01",
  "2026-08-03",
  "2026-09-07",
  "2026-10-12",
  "2026-12-25",
  "2026-12-28",
  "2027-01-01",
  "2027-02-15",
  "2027-04-02",
  "2027-05-24",
  "2027-07-01",
  "2027-08-02",
  "2027-09-06",
  "2027-10-11",
  "2027-12-27",
  "2027-12-28",
]);

/** Fallback season when the page has no "running from ... to ..." line. */
const DEFAULT_SEASON = { start: "2026-05-01", end: "2027-04-30" };

/** Only generate events from today through this date (N months ahead). */
const WINDOW_MONTHS = 1;

/** Programs published on the page are all free public skating. */
const PROGRAM_NAME = "Public Skate";

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

interface WeeklyProgram {
  day: DayName;
  startTime: string;
  endTime: string;
}

interface DatedProgram {
  date: string;
  startTime: string;
  endTime: string;
}

interface Parsed {
  weekly: WeeklyProgram[];
  dated: DatedProgram[];
  season: { start: string; end: string };
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Isolate the WordPress post body that holds the schedule text. */
function extractContent(html: string): string {
  const m = html.match(
    /<div[^>]*class="entry-content[^"]*"[^>]*>([\s\S]*?)<\/div><!-- \.entry-content/
  );
  return m ? m[1] : "";
}

/** Split the body into stripped, non-empty paragraphs. */
function paragraphs(content: string): string[] {
  return content
    .split(/<\/p>/i)
    .map((p) => stripHtml(p))
    .filter((p) => p.length > 0);
}

function toHHMM(h: string, min: string | undefined, ap: string): string {
  let hour = Number.parseInt(h, 10);
  const minute = Number.parseInt(min || "0", 10);
  const isAm = ap.toLowerCase() === "am";
  if (isAm && hour === 12) hour = 0;
  if (!isAm && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "12 - 1 pm" -> ["12:00", "13:00"] (start inherits the end meridiem). */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  const startAp = m[3] || m[6];
  return [toHHMM(m[1], m[2], startAp), toHHMM(m[4], m[5], m[6])];
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse a recurring weekday line ("Tuesday: 12 - 1 pm"). */
function parseWeeklyLine(line: string): WeeklyProgram | null {
  const m = line.match(
    /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b\s*:?\s*(.+)$/i
  );
  if (!m) return null;
  const range = parseTimeRange(m[2]);
  if (!range) return null;
  return { day: m[1].toLowerCase() as DayName, startTime: range[0], endTime: range[1] };
}

/**
 * Parse a dated special ("... July 26,2026 and August 9 to August 30 2026
 * from 11am to 1pm"): explicit dates plus inclusive ranges, restricted to
 * Sundays when the note is labelled as a Sunday skate.
 */
function parseDatedParagraph(text: string): DatedProgram[] {
  const tm = text.match(
    /from\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*to\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!tm) return [];
  const startTime = toHHMM(tm[1], tm[2], tm[3]);
  const endTime = toHHMM(tm[4], tm[5], tm[6]);
  const onlySundays = /sunday/i.test(text);

  const out: DatedProgram[] = [];
  let prefix = text.slice(0, tm.index);

  const rangeRe =
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+to\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})/gi;
  let rm: RegExpExecArray | null;
  while ((rm = rangeRe.exec(prefix)) !== null) {
    const sm = MONTHS.get(rm[1].toLowerCase());
    const em = MONTHS.get(rm[3].toLowerCase());
    if (!sm || !em) continue;
    const year = Number.parseInt(rm[5], 10);
    const cursor = new Date(`${isoDate(year, sm, Number(rm[2]))}T12:00:00Z`);
    const end = new Date(`${isoDate(year, em, Number(rm[4]))}T12:00:00Z`);
    for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      if (onlySundays && cursor.getUTCDay() !== 0) continue;
      out.push({ date: dateStr(cursor), startTime, endTime });
    }
    prefix = prefix.replace(rm[0], " ");
  }

  const dateRe = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/gi;
  let dm: RegExpExecArray | null;
  while ((dm = dateRe.exec(prefix)) !== null) {
    const month = MONTHS.get(dm[1].toLowerCase());
    if (!month) continue;
    const d = new Date(`${isoDate(Number(dm[3]), month, Number(dm[2]))}T12:00:00Z`);
    if (onlySundays && d.getUTCDay() !== 0) continue;
    out.push({ date: dateStr(d), startTime, endTime });
  }

  return out;
}

/** "running from May 2026 to April 2027" -> season bounds. */
function parseSeason(text: string): { start: string; end: string } | null {
  const m = text.match(
    /from\s+([A-Za-z]+)\s+(\d{4})\s+to\s+([A-Za-z]+)\s+(\d{4})/i
  );
  if (!m) return null;
  const sm = MONTHS.get(m[1].toLowerCase());
  const em = MONTHS.get(m[3].toLowerCase());
  if (!sm || !em) return null;
  const startYear = Number.parseInt(m[2], 10);
  const endYear = Number.parseInt(m[4], 10);
  const endDay = new Date(Date.UTC(endYear, em, 0)).getUTCDate();
  return {
    start: isoDate(startYear, sm, 1),
    end: isoDate(endYear, em, endDay),
  };
}

function parsePage(html: string): Parsed {
  const parsed: Parsed = { weekly: [], dated: [], season: DEFAULT_SEASON };
  for (const body of paragraphs(extractContent(html))) {
    for (const line of body.split("\n")) {
      const weekly = parseWeeklyLine(line.trim());
      if (weekly) {
        parsed.weekly.push(weekly);
        continue;
      }
      for (const dated of parseDatedParagraph(line)) parsed.dated.push(dated);
    }
    const season = parseSeason(body);
    if (season) parsed.season = season;
  }
  return parsed;
}

// --- Expand -------------------------------------------------------------

/** Expand a weekly program into explicit dated occurrences within the window. */
function expandWeekly(program: WeeklyProgram, season: Parsed["season"]): string[] {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setUTCMonth(windowEnd.getUTCMonth() + WINDOW_MONTHS);

  let start = new Date(`${season.start}T12:00:00Z`);
  const end = new Date(`${season.end}T12:00:00Z`);
  if (start < today) start = today;
  const effectiveEnd = end < windowEnd ? end : windowEnd;

  const targetIdx = DAYS.indexOf(program.day);
  const out: string[] = [];
  const cursor = new Date(start);
  if (cursor.getUTCDay() !== targetIdx) {
    const delta = (targetIdx - cursor.getUTCDay() + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + delta);
  }
  for (; cursor <= effectiveEnd; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const ds = dateStr(cursor);
    if (STAT_HOLIDAYS.has(ds)) continue;
    out.push(ds);
  }
  return out;
}

/** Convert parsed weekly and dated programs into flat programs. */
function buildPrograms(parsed: Parsed): Program[] {
  const out: Program[] = [];

  for (const weekly of parsed.weekly) {
    for (const date of expandWeekly(weekly, parsed.season)) {
      out.push({
        id: randomUUID(),
        start: `${date}T${weekly.startTime}`,
        end: `${date}T${weekly.endTime}`,
        name: PROGRAM_NAME,
        type: classifyProgram(PROGRAM_NAME),
        notes: "No Skate on Stat Holidays",
        // Moss Park Arena public skating is free.
        ticket: 0,
      });
    }
  }

  const today = dateStr(new Date());
  for (const dated of parsed.dated) {
    if (dated.date < today) continue;
    out.push({
      id: randomUUID(),
      start: `${dated.date}T${dated.startTime}`,
      end: `${dated.date}T${dated.endTime}`,
      name: PROGRAM_NAME,
      type: classifyProgram(PROGRAM_NAME),
      ticket: 0,
    });
  }

  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

/** Derive a display name from the config id ("moss-park" -> "Moss Park"). */
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
  const parsed = parsePage(html);

  if (parsed.weekly.length === 0) {
    throw new Error(`No weekly schedule entries parsed for ${meta.id}.`);
  }

  const programs = buildPrograms(parsed);
  const file = await writeSchedule(meta, programs);
  console.log(
    `[${meta.id}] ${parsed.weekly.length} weekly program(s), ` +
      `${parsed.dated.length} dated program(s), ` +
      `${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
