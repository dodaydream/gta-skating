import type { Arena } from "@/types/arena";
import type { MapBounds } from "@/types/map";
import type { ProgramItem } from "@/types/schedule";

export interface FetchProgramsQuery {
  from: string;
  to: string;
  hideEmpty: boolean;
  bounds?: MapBounds | null;
}

export interface FetchProgramsResult {
  arenas: Arena[];
  items: ProgramItem[];
}

function inRange(start: string, from: string, to: string): boolean {
  return start >= from && start <= to;
}

function withinBounds(arena: Arena, bounds: MapBounds): boolean {
  const { lat, lon } = arena.coordinates ?? {};
  return (
    isFinite(lat) &&
    isFinite(lon) &&
    lat >= bounds.south &&
    lat <= bounds.north &&
    lon >= bounds.west &&
    lon <= bounds.east
  );
}

export async function fetchPrograms(
  query: FetchProgramsQuery
): Promise<FetchProgramsResult> {
  const { from, to, hideEmpty, bounds } = query;
  const { arenas: allArenas } = await import("@/data/schedules");

  const matches: ProgramItem[] = [];
  for (const arena of allArenas) {
    for (const program of arena.schedule.programs) {
      if (inRange(program.start, from, to)) {
        matches.push({ ...program, arena });
      }
    }
  }
  matches.sort((a, b) => a.start.localeCompare(b.start));

  const seen = new Set<string>();
  const arenas: Arena[] = [];
  const addArena = (arena: Arena) => {
    if (seen.has(arena.name)) return;
    seen.add(arena.name);
    arenas.push({
      ...arena,
      schedule: {
        ...arena.schedule,
        programs: arena.schedule.programs.filter((p) =>
          inRange(p.start, from, to)
        ),
      },
    });
  };
  for (const item of matches) addArena(item.arena);
  if (!hideEmpty) {
    for (const arena of allArenas) addArena(arena);
  }

  const items = bounds
    ? matches.filter((item) => withinBounds(item.arena, bounds))
    : matches;

  return { arenas, items };
}
