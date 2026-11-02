import type { Program } from "@/types/schedule";
import type { BusyReport } from "@/types/feedback";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

// Minimum reports before a busyness badge is shown. Defaults to 3; can be
// lowered locally via NEXT_PUBLIC_BUSY_MIN_REPORTS for testing.
const MIN_REPORTS = Number(process.env.NEXT_PUBLIC_BUSY_MIN_REPORTS) || 3;

/**
 * Bucket historical reports onto the program they most likely describe, using
 * the report's day-of-week and minute-of-day in the venue's timezone. Returns
 * the average busy level and the number of matching reports, or `null` when
 * there are fewer than the confidence floor.
 */
export function predictBusy(
  reports: BusyReport[],
  program: Program,
  timezone: string
): { busy: number; n: number } | null {
  const start = dayjs.tz(program.start, timezone);
  const pDow = start.day();
  const s = start.hour() * 60 + start.minute();

  const end = dayjs.tz(program.end, timezone);
  const e = end.hour() * 60 + end.minute();
  const wrapsMidnight = e <= s;

  let total = 0;
  let n = 0;
  for (const report of reports) {
    const at = dayjs(report.reportedAt).tz(timezone);
    if (at.day() !== pDow) continue;
    const m = at.hour() * 60 + at.minute();
    const inWindow = wrapsMidnight ? m >= s || m < e : m >= s && m < e;
    if (!inWindow) continue;
    total += report.busy;
    n += 1;
  }

  if (n < MIN_REPORTS) return null;
  return { busy: total / n, n };
}
