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

export interface Venue {
  name: string;
  url: string;
  timezone: string;
  coordinates: Coordinates;
  address: string;
  info?: InfoItem[];
  rinks?: Rink[];
  amenities?: string[];
  schedule: Schedule;
}
