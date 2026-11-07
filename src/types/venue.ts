import type { Coordinates, Schedule } from "./schedule";

export interface Rink {
  /** Pad label as shown on the venue site/feed, e.g. "Ice Rink - 1". */
  name: string;
  /** Free-form rink type, e.g. "North American / NHL". */
  type: string;
}

/** A labelled extra fact about a venue, e.g. { key: "phone", value: "416-…" }. */
export interface InfoItem {
  /** Stable snake_case key; also used as the i18n lookup key. */
  key: string;
  value: string;
}

/** Indoor vs outdoor ice. */
export type RinkEnvironment = "indoor" | "outdoor";

export interface Venue {
  name: string;
  url: string;
  timezone: string;
  coordinates: Coordinates;
  address: string;
  /** Indoor vs outdoor ice; omitted by sources that don't distinguish. */
  type?: RinkEnvironment;
  info?: InfoItem[];
  rinks?: Rink[];
  amenities?: string[];
  schedule: Schedule;
}

/**
 * Venue facts without the (large, separately fetched) program schedule. This is
 * the shape baked into the client bundle for slug/coordinate lookups; the
 * program schedule is loaded on demand and merged back into a full {@link Venue}.
 */
export type VenueMeta = Omit<Venue, "schedule"> & {
  /** Stable id (UUID) used to join programs to their venue. */
  id: string;
  /** ISO timestamp of the last schedule update, kept for display/metadata. */
  updatedAt: string;
};

/** Which venues the schedule list and map should show. */
export type VenueDisplay = "favorites" | "withPrograms" | "all";
