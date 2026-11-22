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
