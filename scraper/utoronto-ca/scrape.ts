/**
 * Scraper for University of Toronto drop-in ice skate & ice sports.
 *
 * Fetches the KPE drop-in ice page, reads the weekly schedule table for the
 * Varsity Centre arena, expands it into explicit dated events for the season,
 * and writes the result to src/data/varsity-centre-arena.json in the shape
 * consumed by src/data/schedule.ts.
 *
 * Venue metadata lives in ./meta.json (generic, reusable). Anything specific to
 * this crawl (timezone, season window) is kept here so meta.json stays metadata
 * only.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMeta, DayName, Program } from "../types.ts";
import { ProgramType } from "../types.ts";
import { classifyProgram } from "../classify.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../src/data");

// --- Crawl settings (specific to this venue) ----------------------------

const TIMEZONE = "America/Toronto";

/** Only generate events from today through this many days out. */
const LOOKAHEAD_DAYS = 31;

/** Shown on every program: access is not free for the general public. */
const NOTES = "Day pass required for non-members and non-U of T students";

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

/** Table program label -> display name. */
const PROGRAM_NAMES = new Map<string, string>([
  ["skate", "Public Skate"],
  ["family skate", "Family Skate"],
  ["figure skate", "Figure Skating"],
  ["stick n puck", "Stick and Puck"],
  ["shinny", "Shinny"],
  ["hockey", "Hockey"],
]);

/** Table program label -> canonical type (falls back to name matching). */
const PROGRAM_TYPES = new Map<string, ProgramType>([
  ["skate", ProgramType.PublicSkate],
  ["family skate", ProgramType.PublicSkate],
  ["figure skate", ProgramType.FigureSkating],
  ["stick n puck", ProgramType.StickAndPuck],
  ["shinny", ProgramType.PickupHockey],
  ["hockey", ProgramType.PickupHockey],
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
  name: string;
  type: ProgramType;
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

/** "1:00pm-3:55pm" / "11:00am to 12:50pm" -> ["13:00", "15:55"]. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  const startAp = m[3] || m[6];
  return [toHHMM(m[1], m[2], startAp), toHHMM(m[4], m[5], m[6])];
}

/** Find the weekly Mon-Sun schedule table and return its day order. */
function findScheduleTable(html: string): { days: DayName[]; tbody: string } | null {
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let table: RegExpExecArray | null;
  while ((table = tableRe.exec(html)) !== null) {
    const headers: string[] = [];
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    let th: RegExpExecArray | null;
    while ((th = thRe.exec(table[0])) !== null) headers.push(stripHtml(th[1]));
    if (headers.length !== 7 || parseDay(headers[0].split(/\s+/)[0]) !== "monday") {
      continue;
    }
    const days: DayName[] = [];
    for (const header of headers) {
      const day = parseDay(header.split(/\s+/)[0]);
      if (!day) return null;
      days.push(day);
    }
    const body = table[0].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!body) return null;
    return { days, tbody: body[1] };
  }
  return null;
}

function parseTable(html: string): RawEntry[] {
  const table = findScheduleTable(html);
  if (!table) return [];

  const entries: RawEntry[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(table.tbody)) !== null) {
    const cells: string[] = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td: RegExpExecArray | null;
    while ((td = tdRe.exec(row[1])) !== null) cells.push(td[1]);
    if (cells.length !== table.days.length) continue;

    for (let i = 0; i < cells.length; i += 1) {
      const text = stripHtml(cells[i]);
      const range = parseTimeRange(text);
      if (!range) continue;
      const strong = cells[i].match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
      const label = (strong ? stripHtml(strong[1]) : "").trim().toLowerCase();
      const name = PROGRAM_NAMES.get(label) ?? (label || "Skate");
      const type = PROGRAM_TYPES.get(label) ?? classifyProgram(name);
      entries.push({
        day: table.days[i],
        startTime: range[0],
        endTime: range[1],
        name,
        type,
      });
    }
  }
  return entries;
}

/** "2026 Fall Schedule - September 14 to December 18" -> season bounds. */
function parseSeason(html: string): { start: string; end: string } | null {
  const m = html.match(
    /(\d{4})\s+\w*\s*Schedule\s*[-–—]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+to\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i
  );
  if (!m) return null;
  const sm = MONTHS.get(m[2].toLowerCase());
  const em = MONTHS.get(m[4].toLowerCase());
  if (!sm || !em) return null;
  const year = Number.parseInt(m[1], 10);
  return {
    start: isoDate(year, sm, Number.parseInt(m[3], 10)),
    end: isoDate(year, em, Number.parseInt(m[5], 10)),
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

/** Expand a weekly program into explicit dated occurrences within the window. */
function expandWeekly(
  entry: RawEntry,
  season: { start: string; end: string } | null
): string[] {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + LOOKAHEAD_DAYS);

  let start = new Date(today);
  if (season) {
    const seasonStart = new Date(`${season.start}T12:00:00Z`);
    if (seasonStart > start) start = seasonStart;
  }

  let endDate = windowEnd;
  if (season) {
    const seasonEnd = new Date(`${season.end}T12:00:00Z`);
    if (seasonEnd < endDate) endDate = seasonEnd;
  }

  const targetIdx = DAYS.indexOf(entry.day);
  const out: string[] = [];
  const cursor = new Date(start);
  if (cursor.getUTCDay() !== targetIdx) {
    const delta = (targetIdx - cursor.getUTCDay() + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + delta);
  }
  for (; cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    out.push(dateStr(cursor));
  }
  return out;
}

function buildPrograms(
  entries: RawEntry[],
  season: { start: string; end: string } | null
): Program[] {
  const out: Program[] = [];
  for (const entry of entries) {
    for (const date of expandWeekly(entry, season)) {
      out.push({
        id: randomUUID(),
        start: `${date}T${entry.startTime}`,
        end: `${date}T${entry.endTime}`,
        name: entry.name,
        type: entry.type,
        notes: NOTES,
        // Free for U of T students and Sport & Rec members; day pass for others.
        ticket: 0,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

/** Derive a display name from the config id ("varsity-centre-arena" -> ...). */
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
  const entries = parseTable(html);

  if (entries.length === 0) {
    throw new Error(`No weekly schedule entries parsed for ${meta.id}.`);
  }

  const programs = buildPrograms(entries, parseSeason(html));
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
