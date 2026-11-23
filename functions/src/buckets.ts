/**
 * Slot bucketing for busyness reports.
 *
 * This intentionally mirrors `src/lib/feedback.ts` in the app (the client
 * matcher) but is duplicated because the deployed function is a separate
 * package that cannot import from `src/`. Keep the two in sync.
 */

/** A venue-local day-of-week (0 = Sunday) and minute-of-day (0–1439). */
export interface Slot {
  dow: number;
  minute: number;
}

/** Program type attributed to reports written before the field existed. */
export const LEGACY_PROGRAM_TYPE = "Public Skate";

/** Zone used to bucket legacy reports that predate the venue-local start field. */
export const FALLBACK_TIMEZONE = "America/Toronto";

/**
 * Parse a venue-local `"YYYY-MM-DDTHH:mm"` datetime into its day-of-week and
 * minute-of-day. Day-of-week is computed in UTC from the date parts so the host
 * timezone never shifts the calendar day.
 */
export function slotFromStart(local: string): Slot | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return {
    dow: new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day))
    ).getUTCDay(),
    minute: Number(hour) * 60 + Number(minute),
  };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Day-of-week and minute-of-day for an instant in `timeZone`. */
export function slotFromInstant(iso: string, timeZone: string): Slot {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    dow: WEEKDAYS.indexOf(value("weekday")),
    minute: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function toIso(value: unknown): string | null {
  const timestamp = value as { toDate?: () => Date } | null;
  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }
  return null;
}

/**
 * Bucket key for a report document: the program type and the slot of the
 * program it describes. Falls back to the report instant for legacy documents.
 */
export function bucketKeyFor(data: {
  programStartAt?: unknown;
  programType?: unknown;
  reportedAt?: unknown;
}): { programType: string; slot: Slot } | null {
  const programType =
    typeof data.programType === "string"
      ? data.programType
      : LEGACY_PROGRAM_TYPE;

  if (typeof data.programStartAt === "string") {
    const slot = slotFromStart(data.programStartAt);
    if (slot) return { programType, slot };
  }

  const iso = toIso(data.reportedAt);
  if (!iso) return null;
  return { programType, slot: slotFromInstant(iso, FALLBACK_TIMEZONE) };
}
