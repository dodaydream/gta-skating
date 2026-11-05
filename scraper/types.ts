/** A single ice pad at a venue; a venue may have several. */
export interface Rink {
  /** Pad label as shown on the venue site/feed, e.g. "Ice Rink - 1". */
  name: string;
  /** Free-form rink type, e.g. "North American / NHL". */
  type: string;
}

export interface VenueMeta {
  id: string;
  url: string;
  address: string;
  coordinates: { lat: number; lon: number };
  /** Ice pads at this venue (name + free-form type). */
  rinks?: Rink[];
  /** Free-form facility amenities, e.g. "Skate rentals". */
  amenities?: string[];
}

/** Single-venue entry inside a multi-venue scraper's meta.json. */
export interface VenueMetaEntry extends VenueMeta {
  name: string;
  /** City of Toronto location id used by the toronto-ca feed. */
  locationId?: number;
  /** Daysmart Recreation facility id used by the canlan scraper. */
  facilityId?: number;
  /** ActiveNet center id used by the mississauga-ca scraper. */
  centerId?: number;
  type: "indoor" | "outdoor";
}

/** Top-level shape of a multi-venue scraper's meta.json (a list of venues). */
export interface VenueMetaList {
  venues: VenueMetaEntry[];
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

export interface VenueSchedule {
  updatedAt: string;
  programs: Program[];
}

export interface Venue {
  name: string;
  url: string;
  timezone: string;
  address: string;
  coordinates: Coordinates;
  rinks?: Rink[];
  amenities?: string[];
  schedule: VenueSchedule;
}