import type { Arena } from "@/types/arena";
import type { MapBounds } from "@/types/map";
import type { Program, ProgramItem, ProgramType } from "@/types/schedule";

export interface FetchProgramsQuery {
  from: string;
  to: string;
  hideEmpty: boolean;
  types?: ProgramType[];
  bounds?: MapBounds | null;
}

export interface FetchProgramsResult {
  arenas: Arena[];
  items: ProgramItem[];
}

function inRange(
  start: string,
  end: string,
  from: string,
  to: string
): boolean {
  return start <= to && end >= from;
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
  const types = query.types ?? [];
  const typeFilter = types.length > 0 ? new Set(types) : null;
  const matchesType = (program: Program) =>
    !typeFilter || typeFilter.has(program.type);
  const { arenas: allArenas } = await import("@/data/schedules");

  const matches: ProgramItem[] = [];
  for (const arena of allArenas) {
    for (const program of arena.schedule.programs) {
      if (matchesType(program) && inRange(program.start, program.end, from, to)) {
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
        programs: arena.schedule.programs.filter(
          (p) => matchesType(p) && inRange(p.start, p.end, from, to)
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
