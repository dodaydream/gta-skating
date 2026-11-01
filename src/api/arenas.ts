import type { Arena } from "@/types/arena";

export async function fetchArenaDetails(name: string): Promise<Arena> {
  const { arenas } = await import("@/data/schedules");
  const arena = arenas.find((a) => a.name === name);
  if (!arena) {
    throw new Error(`Arena not found: ${name}`);
  }
  return arena;
}