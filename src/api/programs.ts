import type { Venue } from "@/types/venue";
import type { MapBounds } from "@/types/map";
import type { Program, ProgramItem, ProgramType } from "@/types/schedule";

export interface FetchProgramsQuery {
  from: string;
  to: string;
  hideEmpty: boolean;
  types?: ProgramType[];
  amenities?: string[];
  bounds?: MapBounds | null;
  favoritesOnly?: boolean;
  favoriteSlugs?: readonly string[];
}

export interface FetchProgramsResult {
  venues: Venue[];
  items: ProgramItem[];
}

function inRange(
  start: string,
  end: string,
  from: string,
  to: string
): boolean {
  return start <= to && end > from;
}

function withinBounds(venue: Venue, bounds: MapBounds): boolean {
  const { lat, lon } = venue.coordinates ?? {};
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
  const amenities = query.amenities ?? [];
  const matchesAmenities = (venue: Venue) =>
    amenities.length === 0 ||
    amenities.every((a) => (venue.amenities ?? []).includes(a));
  const favoriteSet = query.favoritesOnly
    ? new Set(query.favoriteSlugs ?? [])
    : null;
  const { venues: scheduleVenues, getSlugForVenue } = await import(
    "@/data/schedules"
  );
  const allVenues = scheduleVenues
    .filter(matchesAmenities)
    .filter(
      (venue) => !favoriteSet || favoriteSet.has(getSlugForVenue(venue.name))
    );

  const matches: ProgramItem[] = [];
  for (const venue of allVenues) {
    for (const program of venue.schedule.programs) {
      if (matchesType(program) && inRange(program.start, program.end, from, to)) {
        matches.push({ ...program, venue });
      }
    }
  }
  matches.sort((a, b) => a.start.localeCompare(b.start));

  const seen = new Set<string>();
  const venues: Venue[] = [];
  const addVenue = (venue: Venue) => {
    if (seen.has(venue.name)) return;
    seen.add(venue.name);
    venues.push({
      ...venue,
      schedule: {
        ...venue.schedule,
        programs: venue.schedule.programs.filter(
          (p) => matchesType(p) && inRange(p.start, p.end, from, to)
        ),
      },
    });
  };
  for (const item of matches) addVenue(item.venue);
  if (!hideEmpty) {
    for (const venue of allVenues) addVenue(venue);
  }

  const items = bounds
    ? matches.filter((item) => withinBounds(item.venue, bounds))
    : matches;

  return { venues, items };
}
