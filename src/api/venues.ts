import type { Venue } from "@/types/venue";
import { getVenueBySlug, toVenue } from "@/data/venue-meta";
import { loadProgramsForRange } from "@/api/program-shards";

export interface VenueDetailRange {
  from?: string;
  to?: string;
}

/** Local "YYYY-MM-DD" (data timestamps are naive local datetimes). */
function localDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateISO(date);
}

/**
 * Full venue (metadata + programs) for the detail modal. Programs are loaded
 * from the month shards covering the modal's window — the current month and the
 * next, plus any active filter range — rather than the whole dataset.
 */
export async function fetchVenueDetails(
  slug: string,
  range?: VenueDetailRange
): Promise<Venue> {
  const meta = getVenueBySlug(slug);
  if (!meta) {
    throw new Error(`Venue not found: ${slug}`);
  }

  const today = localDateISO(new Date());
  let from = today;
  let to = addDays(today, 40);
  if (range?.from && range.from < from) from = range.from;
  if (range?.to && range.to > to) to = range.to;

  const programsById = await loadProgramsForRange(from, to);
  return toVenue(meta, programsById.get(meta.id) ?? []);
}
