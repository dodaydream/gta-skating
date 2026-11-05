import type { Coordinates, Schedule } from "./schedule";

export interface Rink {
  /** Pad label as shown on the venue site/feed, e.g. "Ice Rink - 1". */
  name: string;
  /** Free-form rink type, e.g. "North American / NHL". */
  type: string;
}

export interface Venue {
  name: string;
  url: string;
  timezone: string;
  coordinates: Coordinates;
  address: string;
  rinks?: Rink[];
  schedule: Schedule;
}
