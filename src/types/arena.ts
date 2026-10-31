import type { Coordinates, Schedule } from "./schedule";

export interface Arena {
  name: string;
  url: string;
  timezone: string;
  coordinates: Coordinates;
  address: string;
  schedule: Schedule;
}