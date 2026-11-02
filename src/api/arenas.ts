import type { Arena } from "@/types/arena";
import { getArenaBySlug } from "@/data/schedules";

export async function fetchArenaDetails(slug: string): Promise<Arena> {
  const arena = getArenaBySlug(slug);
  if (!arena) {
    throw new Error(`Arena not found: ${slug}`);
  }
  return arena;
}