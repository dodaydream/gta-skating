export type BusyLevel = 1 | 2 | 3; // 1 = Quiet, 2 = Moderate, 3 = Busy

export interface BusyReport {
  venueSlug: string;
  reportedAt: string; // ISO, converted from Firestore Timestamp
  busy: BusyLevel;
  uid?: string;
}
