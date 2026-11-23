import { ProgramType } from "./schedule";

export type BusyLevel = 1 | 2 | 3; // 1 = Quiet, 2 = Moderate, 3 = Busy

/**
 * Program type attributed to reports written before the field existed. General
 * drop-in leisure skating is the safe default for those observations.
 */
export const LEGACY_PROGRAM_TYPE = ProgramType.PublicSkate;

export interface BusyReport {
  venueId: string;
  reportedAt: string; // ISO, converted from Firestore Timestamp
  busy: BusyLevel;
  uid?: string;
  /** Program type the observation describes; legacy reports backfill to Public Skate. */
  programType: ProgramType;
  /** Venue-local program window, "YYYY-MM-DDTHH:mm" (absent on legacy reports). */
  programStartAt?: string;
  programEndsAt?: string;
}

/** Tally for one (programType, day-of-week, minute-of-day) bucket. */
export interface BusyBucket {
  s: number; // sum of busy levels
  n: number; // number of reports
}

/** Sparse aggregate: `buckets[programType][dow][minute] = { s, n }`. */
export type BusyAggregateBuckets = Record<
  string,
  Record<string, Record<string, BusyBucket>>
>;

/**
 * Pre-aggregated busyness for a venue, maintained by the scheduled Cloud
 * Function and read directly by the client. Keyed by program type so a report
 * for one activity does not influence another.
 */
export interface BusyAggregate {
  buckets: BusyAggregateBuckets;
  updatedAt?: string; // ISO, converted from Firestore Timestamp
}
