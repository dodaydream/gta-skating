export interface ArenaMeta {
  id: string;
  url: string;
  address: string;
  coordinates: { lat: number; lon: number };
}

/** Single-arena entry inside a multi-arena scraper's meta.json. */
export interface ArenaMetaEntry extends ArenaMeta {
  name: string;
  locationId: number;
  type: "indoor" | "outdoor";
}

/** Top-level shape of a multi-arena scraper's meta.json (a list of arenas). */
export interface ArenaMetaList {
  arenas: ArenaMetaEntry[];
}

export type DayName =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface RawProgram {
  name: string;
  day: DayName;
  startTime: string;
  endTime: string;
  start: string;
  notes?: string;
  modelId: string;
}

export interface Program {
  id: string;
  start: string;
  end: string;
  name: string;
  notes?: string;
}

export interface ArenaEvent {
  date: string;
  programs: Program[];
}

export interface ArenaSchedule {
  updatedAt: string;
  events: ArenaEvent[];
}

export interface Arena {
  name: string;
  url: string;
  timezone: string;
  address: string;
  coordinates: Coordinates;
  schedule: ArenaSchedule;
}