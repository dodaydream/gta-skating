/**
 * Scraper for Leaside Gardens drop-in skating (public skate, figure skating,
 * adult shinny).
 *
 * Fetches the venue's Enfold/WordPress schedule page, extracts the recurring
 * weekly programs (grouped by their section heading), expands them into
 * explicit dated events, and writes the result to out/scraped-data/leaside-gardens.json
 * in the shape consumed by scraper/build-client-data.ts.
 *
 * Venue metadata lives in ./meta.json (generic, reusable). Anything specific to
 * this crawl (timezone, walk-in prices) is kept here so meta.json stays
 * metadata only.
 *
 * Usage:  node scrape.ts
 */

import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Venue, VenueMeta, DayName, Program } from "../types.ts";
import { normalizeRinkType } from "../types.ts";
import { ProgramType } from "../types.ts";
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

/** Only generate events from today through this many days out. */
const LOOKAHEAD_DAYS = 31;

/**
 * Published single-visit prices (CAD, HST included) from the venue's page.
 * Drop-in public skating is free; figure skating and adult shinny are $11.50.
 */
const PUBLIC_SKATE_FEE = 0;
const PROGRAM_FEE = 11.5;

/** Drop-in price for a program, from its canonical type. */
function ticketFor(type: ProgramType): number {
  return type === ProgramType.PublicSkate ? PUBLIC_SKATE_FEE : PROGRAM_FEE;
}

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
  name: string;
  type: ProgramType;
  /** Optional known start date ("resumes on ..."), when the page gives one. */
  start?: string;
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

/**
 * Walk the Enfold page in order, returning its section headings and text
 * blocks. Headings live in `av-special-heading` divs while the schedule rows
 * live in `av_textblock_section` sections, so both are tokenised together to
 * keep the heading that precedes each block.
 */
function extractTokens(html: string): { heading: boolean; html: string }[] {
  const re =
    /<div[^>]*class='[^']*av-special-heading[^']*'[\s\S]*?<\/h3>|<section[^>]*class='[^']*av_textblock_section[^']*'[\s\S]*?<\/section>/gi;
  const tokens: { heading: boolean; html: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    tokens.push({ heading: m[0].includes("<h3"), html: m[0] });
  }
  return tokens;
}

/** Map a leading weekday token ("TUESDAYS", "Sat") to a DayName. */
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

/** "11:00am - 12:00pm" / "11:15 am to 12:15pm" -> ["11:00", "12:00"]. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  const startAp = m[3] || m[6];
  return [toHHMM(m[1], m[2], startAp), toHHMM(m[4], m[5], m[6])];
}

/** "resumes on September 8th, 2026" -> "2026-09-08" (year required). */
function parseResumeDate(text: string): string | null {
  const m = text.match(
    /resumes?\s+on[^,]*?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i
  );
  if (!m) return null;
  const month = MONTHS.get(m[1].toLowerCase());
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(
    Number.parseInt(m[2], 10)
  ).padStart(2, "0")}`;
}

/** Short display name for a section heading. */
function programName(title: string): string {
  if (/public skating/i.test(title)) return "Public Skate";
  if (/shinny/i.test(title)) return "Adult Shinny";
  if (/figure skating/i.test(title)) return "Figure Skating";
  return title.replace(/\s*\.\s*.*$/, "").trim() || title;
}

function parseSections(html: string): RawEntry[] {
  const entries: RawEntry[] = [];
  let title = "";

  for (const token of extractTokens(html)) {
    if (token.heading) {
      const heading = token.html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      if (heading) title = stripHtml(heading[1]);
      continue;
    }
    if (!title) continue;

    const body = stripHtml(token.html);
    const name = programName(title);
    const type = classifyProgram(name);
    const start = parseResumeDate(body) ?? undefined;

    for (const line of body.split("\n")) {
      const dayToken = line.trim().split(/\s+/)[0];
      const day = parseDay(dayToken);
      if (!day) continue;
      const range = parseTimeRange(line);
      if (!range) continue;
      entries.push({
        day,
        startTime: range[0],
        endTime: range[1],
        name,
        type,
        start,
      });
    }
  }

  return entries;
}

// --- Expand -------------------------------------------------------------

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Expand a weekly program into explicit dated occurrences within the window. */
function expandWeekly(entry: RawEntry): string[] {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + LOOKAHEAD_DAYS);

  let start = new Date(today);
  if (entry.start) {
    const resume = new Date(`${entry.start}T12:00:00Z`);
    if (resume > start) start = resume;
  }

  const targetIdx = DAYS.indexOf(entry.day);
  const out: string[] = [];
  const cursor = new Date(start);
  if (cursor.getUTCDay() !== targetIdx) {
    const delta = (targetIdx - cursor.getUTCDay() + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + delta);
  }
  for (; cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const ds = dateStr(cursor);
    if (STAT_HOLIDAYS.has(ds)) continue;
    out.push(ds);
  }
  return out;
}

function buildPrograms(entries: RawEntry[]): Program[] {
  const out: Program[] = [];
  for (const entry of entries) {
    for (const date of expandWeekly(entry)) {
      out.push({
        id: randomUUID(),
        start: `${date}T${entry.startTime}`,
        end: `${date}T${entry.endTime}`,
        name: entry.name,
        type: entry.type,
        ticket: ticketFor(entry.type),
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

/** Derive a display name from the config id ("leaside-gardens" -> "Leaside ..."). */
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
  const entries = parseSections(html);

  if (entries.length === 0) {
    throw new Error(`No weekly schedule entries parsed for ${meta.id}.`);
  }

  const programs = buildPrograms(entries);
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
