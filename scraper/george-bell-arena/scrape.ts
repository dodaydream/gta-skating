/**
 * Scraper for George Bell Arena free public skating.
 *
 * Fetches the venue's public-skating page, extracts the recurring weekly
 * programs, expands them into explicit dated events, and writes the result to
 * src/data/george-bell-arena.json in the shape consumed by
 * src/data/schedule.ts.
 *
 * Venue metadata lives in ./meta.json (generic, reusable). Anything specific to
 * this crawl (timezone) is kept here so meta.json stays metadata only.
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

/** Only generate events from today through this many days out. */
const LOOKAHEAD_DAYS = 31;

/** Program label published by the venue; all sessions are free. */
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

/** "3pm-4pm" / "3:30pm - 5pm" -> ["15:00", "16:00"]. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  const startAp = m[3] || m[6];
  return [toHHMM(m[1], m[2], startAp), toHHMM(m[4], m[5], m[6])];
}

function parsePage(html: string): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const line of stripHtml(html).split("\n")) {
    const day = parseDay(line.trim().split(/\s+/)[0]);
    if (!day) continue;
    const range = parseTimeRange(line);
    if (!range) continue;
    entries.push({ day, startTime: range[0], endTime: range[1] });
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

  const targetIdx = DAYS.indexOf(entry.day);
  const out: string[] = [];
  const cursor = new Date(today);
  if (cursor.getUTCDay() !== targetIdx) {
    const delta = (targetIdx - cursor.getUTCDay() + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + delta);
  }
  for (; cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    out.push(dateStr(cursor));
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
        name: PROGRAM_NAME,
        type: classifyProgram(PROGRAM_NAME),
        // George Bell Arena public skating is free.
        ticket: 0,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

/** Derive a display name from the config id ("george-bell" -> "George Bell"). */
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
  const entries = parsePage(html);

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
