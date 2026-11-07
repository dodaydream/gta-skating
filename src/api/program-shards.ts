import type { Program, VenueProgram } from "@/types/schedule";
import { programMonths } from "@/data/venue-meta";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const availableMonths = new Set(programMonths);
const cache = new Map<string, Promise<VenueProgram[]>>();

/** "YYYY-MM" keys for every available month touched by [from, to] (inclusive). */
export function monthsInRange(from: string, to: string): string[] {
  if (!from || !to) return [];
  const start = from.slice(0, 7);
  const end = to.slice(0, 7);
  let [year, month] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  if (!year || !month || !endYear || !endMonth) return [];

  const months: string[] = [];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (availableMonths.has(key)) months.push(key);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function fetchMonth(month: string): Promise<VenueProgram[]> {
  const cached = cache.get(month);
  if (cached) return cached;
  const request = fetch(`${BASE_PATH}/data/programs-${month}.json`).then(
    (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load programs for ${month}: ${res.status}`);
      }
      return res.json() as Promise<VenueProgram[]>;
    }
  );
  // Drop a failed request so a later call can retry instead of caching the error.
  void request.catch(() => cache.delete(month));
  cache.set(month, request);
  return request;
}

/**
 * Programs for every venue in the months overlapping [from, to], grouped by
 * venue id so they can be joined to venue metadata. Shards are fetched once and
 * cached for the session.
 */
export async function loadProgramsForRange(
  from: string,
  to: string
): Promise<Map<string, Program[]>> {
  const shards = await Promise.all(monthsInRange(from, to).map(fetchMonth));
  const merged = new Map<string, Program[]>();
  // A program can appear in two adjacent month shards (it straddles the
  // boundary); dedupe by program id so a multi-month range doesn't double-count.
  const seen = new Set<string>();
  for (const shard of shards) {
    for (const { venueId, ...program } of shard) {
      if (seen.has(program.id)) continue;
      seen.add(program.id);
      let list = merged.get(venueId);
      if (!list) {
        list = [];
        merged.set(venueId, list);
      }
      list.push(program);
    }
  }
  return merged;
}
