/**
 * Scraper for Bill Bolton Venue.
 *
 * Fetches the venue's public-skating page, extracts the recurring weekly
 * programs, expands them into explicit dated events for the season, and writes
 * the result to out/scraped-data/bill-bolton-arena.json in the shape consumed by
 * scraper/build-client-data.ts.
 *
 * Venue metadata lives in ./meta.json (generic, reusable). Anything specific to
 * this crawl (season window, timezone) is kept here so meta.json
 * stays metadata only.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Venue,
  VenueMeta,
  DayName,
  Program,
  RawProgram,
} from "../types.ts";
import { normalizeRinkType } from "../types.ts";
import { classifyProgram } from "../classify.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../out/scraped-data");

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

/** Recurring programs run weekly from their start date through season end. */
const SEASON = { start: "2026-09-28", end: "2027-03-31" };

/** Only generate events from today through this date (N months ahead). */
const WINDOW_MONTHS = 1;

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

interface Heading {
  tag: "h3" | "h2" | "p";
  text: string;
}

/** Collect non-empty heading texts from a Squarespace schedule block. */
function splitHeadings(block: string): Heading[] {
  const out: Heading[] = [];
  const re = /<(h3|h2|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const text = tagToText(m[2]);
    if (text) out.push({ tag: m[1].toLowerCase() as Heading["tag"], text });
  }
  return out;
}

function tagToText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Isolate the Squarespace html-content blocks that can hold schedule text. */
function extractBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re =
    /<div class="sqs-html-content"[^>]*data-sqsp-text-block-content[\s\S]*?<\/div>\s*<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) blocks.push(m[0]);
  return blocks;
}

/** Identify a recurring day from the leading word of a line ("Fridays"). */
function parseDay(text: string): DayName | null {
  const first = text.toLowerCase().split(/\s+/)[0];
  const base = first.endsWith("s") ? first.slice(0, -1) : first;
  return (DAYS as string[]).includes(base) ? (base as DayName) : null;
}

function toHHMM(h: string, min: string, ap: string): string {
  let hour = Number.parseInt(h, 10);
  const minute = Number.parseInt(min || "0", 10);
  const isAm = ap.toLowerCase() === "am";
  if (isAm && hour === 12) hour = 0;
  if (!isAm && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Extract "5:40pm-7:15pm" -> [start, end] as HH:MM. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  return [toHHMM(m[1], m[2], m[3]), toHHMM(m[4], m[5], m[6])];
}

/** Extract "Starts October 2nd,2026" -> "2026-10-02" (else null). */
function parseStartDate(text: string): string | null {
  const m = text.match(
    /starts\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s*(\d{4})/i
  );
  if (!m) return null;
  const month = MONTHS.get(m[1].toLowerCase());
  if (!month) return null;
  const day = String(Number.parseInt(m[2], 10)).padStart(2, "0");
  return `${m[3]}-${String(month).padStart(2, "0")}-${day}`;
}

/** Parse one block into zero or more recurring programs. */
function parseBlock(block: string, meta: VenueMeta): RawProgram[] {
  const headings = splitHeadings(block);
  const programs: RawProgram[] = [];
  let title: string | null = null;
  let current: RawProgram | null = null;

  const newEntry = (day: DayName | null): RawProgram => {
    const name = title ?? meta.id;
    const entry: RawProgram = {
      name,
      day: day as DayName,
      startTime: "",
      endTime: "",
      start: "",
      notes: undefined,
    };
    programs.push(entry);
    return entry;
  };

  for (const { tag, text } of headings) {
    if (tag === "h3") {
      title = text;
      continue;
    }
    const range = parseTimeRange(text);
    const day = parseDay(text);
    if (day && range) {
      current = newEntry(day);
      current.startTime = range[0];
      current.endTime = range[1];
    }
    const start = parseStartDate(text);
    if (start) {
      if (!current) current = newEntry(day);
      current.start = start;
      continue;
    }
    if (!day && !range && /no skate on stat/i.test(text)) {
      if (!current) current = newEntry(null);
      current.notes = text;
    }
  }

  return programs.filter(
    (p) => Boolean(p.start) && Boolean(p.day) && Boolean(p.startTime)
  );
}

// --- Expand -------------------------------------------------------------

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Expand a weekly program into explicit dated occurrences within the window. */
function expandWeekly(program: RawProgram): string[] {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setUTCMonth(windowEnd.getUTCMonth() + WINDOW_MONTHS);

  let start = new Date(`${program.start}T12:00:00Z`);
  const end = new Date(`${SEASON.end}T12:00:00Z`);

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

/** Convert parsed recurring programs into flat programs with ISO datetimes. */
function buildPrograms(parsed: RawProgram[]): Program[] {
  const out: Program[] = [];
  for (const p of parsed) {
    for (const date of expandWeekly(p)) {
      out.push({
        id: randomUUID(),
        start: `${date}T${p.startTime}`,
        end: `${date}T${p.endTime}`,
        name: p.name,
        type: classifyProgram(p.name),
        notes: p.notes,
        // Bill Bolton public skating is free.
        ticket: 0,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

/** Derive a display name from the config id ("bill-bolton" -> "Bill Bolton"). */
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
  const blocks = extractBlocks(html);
  const parsed: RawProgram[] = [];
  for (const block of blocks) parsed.push(...parseBlock(block, meta));

  if (parsed.length === 0) {
    throw new Error(`No schedule entries parsed for ${meta.id}.`);
  }

  const programs = buildPrograms(parsed);
  const file = await writeSchedule(meta, programs);
  console.log(
    `[${meta.id}] ${parsed.length} recurring program(s), ` +
      `${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});