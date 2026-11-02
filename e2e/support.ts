import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

export interface ProgramData {
  id: string;
  start: string;
  end: string;
  name: string;
  type: string;
  notes?: string;
  ticket: number;
}

export interface VenueData {
  name: string;
  url?: string;
  timezone: string;
  address: string;
  coordinates?: { lat: number; lon: number };
  schedule: { updatedAt: string; programs: ProgramData[] };
}

const DATA_DIR = resolve(process.cwd(), "src/data");

/** Read the scraped venue JSON that the app serves from `src/data`. */
export function loadVenues(): VenueData[] {
  return readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(resolve(DATA_DIR, file), "utf8")) as VenueData);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every program across every venue, flattened. */
export function allPrograms(venues: VenueData[]): ProgramData[] {
  return venues.flatMap((venue) => venue.schedule.programs);
}

/** Mirrors the range test in `src/api/programs.ts`: `start <= to && end >= from`. */
export function countInRange(
  venues: VenueData[],
  from: string,
  to: string,
  type?: string
): number {
  let count = 0;
  for (const venue of venues) {
    for (const program of venue.schedule.programs) {
      if (type && program.type !== type) continue;
      if (program.start <= to && program.end >= from) count++;
    }
  }
  return count;
}

/** The calendar day with the most programs, so list assertions have data to see. */
export function densestDay(venues: VenueData[]): string {
  const counts = new Map<string, number>();
  for (const program of allPrograms(venues)) {
    const day = program.start.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const [day] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return day;
}

/** The most common program type, used to keep filtered result sets non-empty. */
export function mostCommonType(venues: VenueData[]): string {
  const counts = new Map<string, number>();
  for (const program of allPrograms(venues)) {
    counts.set(program.type, (counts.get(program.type) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The UTC instant whose America/Toronto wall clock reads `day` at `time`.
 * Venue schedules store naive America/Toronto timestamps, so the page clock
 * must be aligned to that zone for "today" to match the data.
 */
export function torontoInstant(day: string, time = "00:00"): Date {
  const target = Date.parse(`${day}T${time}:00Z`);
  const offsetAt = (instant: number): number => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Toronto",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(new Date(instant))
        .map((part) => [part.type, part.value])
    ) as Record<string, string>;
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second)
    );
    return asUtc - instant;
  };

  let instant = target;
  for (let i = 0; i < 2; i++) instant = target - offsetAt(instant);
  return new Date(instant);
}

/** Freeze the page's clock to midnight (America/Toronto) of the given day. */
export async function freezeToDay(page: Page, day: string): Promise<void> {
  await page.clock.setFixedTime(torontoInstant(day));
}

/** Freeze to a day with programs and load the home page. */
export async function openDensestDay(
  page: Page
): Promise<{ venues: VenueData[]; day: string }> {
  const venues = loadVenues();
  const day = densestDay(venues);
  await freezeToDay(page, day);
  await page.goto("/");
  return { venues, day };
}

/** Scope for the desktop sidebar (the mobile drawer mirrors it, hidden). */
export function sidebar(page: Page) {
  return page.locator("aside");
}

export async function programCount(page: Page): Promise<number> {
  const text = await sidebar(page)
    .getByText(/\d+ programs? found/)
    .innerText();
  return Number(text.match(/(\d+)/)?.[1] ?? "0");
}
