import type { Program } from "@/types/schedule";
import type { BusyAggregate } from "@/types/feedback";

/** A venue-local day-of-week (0 = Sunday) and minute-of-day (0–1439). */
export interface Slot {
  dow: number;
  minute: number;
}

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

/**
 * Day-of-week and minute-of-day for an instant in `timeZone`. Used to bucket
 * legacy reports that predate the venue-local `programStartAt` field.
 */
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

/**
 * Sum the pre-aggregated reports that match a program, using its program type,
 * day-of-week, and minute-of-day window. Returns the average busy level and the
 * number of matching reports, or `null` when there are fewer than 3 reports
 * (confidence floor).
 */
export function predictBusy(
  aggregate: BusyAggregate | null,
  program: Program
): { busy: number; n: number } | null {
  if (!aggregate) return null;

  const byDay = aggregate.buckets[program.type];
  if (!byDay) return null;

  const start = slotFromStart(program.start);
  const end = slotFromStart(program.end);
  if (!start || !end) return null;

  const day = byDay[String(start.dow)];
  if (!day) return null;

  const s = start.minute;
  const e = end.minute;
  const wrapsMidnight = e <= s;

  let total = 0;
  let n = 0;
  for (const [minute, cell] of Object.entries(day)) {
    const m = Number(minute);
    const inWindow = wrapsMidnight ? m >= s || m < e : m >= s && m < e;
    if (!inWindow) continue;
    total += cell.s;
    n += cell.n;
  }

  if (n < 3) return null;
  return { busy: total / n, n };
}
