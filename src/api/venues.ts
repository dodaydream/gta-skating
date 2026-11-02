import type { Venue } from "@/types/venue";
import { getVenueBySlug } from "@/data/schedules";

export async function fetchVenueDetails(slug: string): Promise<Venue> {
  const venue = getVenueBySlug(slug);
  if (!venue) {
    throw new Error(`Venue not found: ${slug}`);
  }
  return venue;
}
