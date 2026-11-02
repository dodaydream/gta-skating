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

/**
 * Canonical program categories. Mirrors src/types/schedule.ts (which uses a TS
 * enum); the scraper runs under Node's strip-only type mode, which rejects
 * `enum`, so this is a const object with a derived union type instead.
 */
export const ProgramType = {
  PublicSkate: "Public Skate",
  PickupHockey: "Pickup Hockey",
  FigureSkating: "Figure Skating",
  StickAndPuck: "Stick and Puck",
  Ringette: "Ringette",
  IceBreakdancing: "Ice Breakdancing",
} as const;

export type ProgramType = (typeof ProgramType)[keyof typeof ProgramType];

export interface RawProgram {
  name: string;
  day: DayName;
  startTime: string;
  endTime: string;
  start: string;
  notes?: string;
}

export interface Program {
  id: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  name: string;
  type: ProgramType;
  notes?: string;
  /** Drop-in ticket price in CAD; 0 means the program is free. */
  ticket: number;
}

export interface ArenaSchedule {
  updatedAt: string;
  programs: Program[];
}

export interface Arena {
  name: string;
  url: string;
  timezone: string;
  address: string;
  coordinates: Coordinates;
  schedule: ArenaSchedule;
}