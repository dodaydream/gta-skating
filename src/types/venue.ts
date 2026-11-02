import type { Coordinates, Schedule } from "./schedule";

export interface Venue {
  name: string;
  url: string;
  timezone: string;
  coordinates: Coordinates;
  address: string;
  schedule: Schedule;
}
