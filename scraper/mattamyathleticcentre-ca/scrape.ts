/**
 * Scraper for Mattamy Athletic Centre community skates.
 *
 * Fetches the venue's community-skates page, reads the published one-off
 * Community Skate dates, and writes the result to
 * src/data/mattamy-athletic-centre.json in the shape consumed by
 * src/data/schedule.ts.
 *
 * The page also lists a TMU student/faculty/staff skate, but that is limited to
 * the Toronto Metropolitan University community, so it is not a public drop-in
 * and is intentionally not scraped.
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
import type { Venue, VenueMeta, Program } from "../types.ts";
import { classifyProgram } from "../classify.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../src/data");

// --- Crawl settings (specific to this venue) ----------------------------

const TIMEZONE = "America/Toronto";

/** Program label published by the venue; all sessions are free. */
const PROGRAM_NAME = "Community Skate";

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
  date: string;
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

function toHHMM(h: string, min: string | undefined, ap: string): string {
  let hour = Number.parseInt(h, 10);
  const minute = Number.parseInt(min || "0", 10);
  const isAm = ap.toLowerCase() === "am";
  if (isAm && hour === 12) hour = 0;
  if (!isAm && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "11am - 1pm" / "3:30pm to 5pm" -> ["11:00", "13:00"]. */
function parseTimeRange(text: string): [string, string] | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
  );
  if (!m) return null;
  const startAp = m[3] || m[6];
  return [toHHMM(m[1], m[2], startAp), toHHMM(m[4], m[5], m[6])];
}

/** "Saturday December 26th, 2026 11am - 1pm" -> a dated entry. */
function parseEntry(text: string): RawEntry | null {
  const dateMatch = text.match(
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/
  );
  if (!dateMatch) return null;
  const month = MONTHS.get(dateMatch[1].toLowerCase());
  if (!month) return null;
  const range = parseTimeRange(text);
  if (!range) return null;
  const day = String(Number.parseInt(dateMatch[2], 10)).padStart(2, "0");
  return {
    date: `${dateMatch[3]}-${String(month).padStart(2, "0")}-${day}`,
    startTime: range[0],
    endTime: range[1],
  };
}

/** Read the one-off Community Skate dates from the page's first section. */
function parsePage(html: string): RawEntry[] {
  const headingIdx = html.search(/<h3>\s*COMMUNITY SKATES/i);
  if (headingIdx === -1) {
    throw new Error("Community Skates section not found on page.");
  }
  const rest = html.slice(headingIdx);
  const hrIdx = rest.search(/<hr\b/i);
  const section = hrIdx === -1 ? rest : rest.slice(0, hrIdx);

  const entries: RawEntry[] = [];
  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(section)) !== null) {
    const entry = parseEntry(stripHtml(m[1]));
    if (entry) entries.push(entry);
  }
  return entries;
}

// --- Build -------------------------------------------------------------

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function buildPrograms(entries: RawEntry[]): Program[] {
  const today = dateStr(new Date());
  const out: Program[] = [];
  for (const entry of entries) {
    if (entry.date < today) continue;
    out.push({
      id: randomUUID(),
      start: `${entry.date}T${entry.startTime}`,
      end: `${entry.date}T${entry.endTime}`,
      name: PROGRAM_NAME,
      type: classifyProgram(PROGRAM_NAME),
      // Community skates are free and open to everyone.
      ticket: 0,
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- Write -------------------------------------------------------------

/** Derive a display name from the config id ("mattamy-athletic-centre" -> ...). */
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
  const entries = parsePage(html);

  if (entries.length === 0) {
    throw new Error(`No community skate entries parsed for ${meta.id}.`);
  }

  const programs = buildPrograms(entries);
  const file = await writeSchedule(meta, programs);
  console.log(
    `[${meta.id}] ${entries.length} published date(s), ` +
      `${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
