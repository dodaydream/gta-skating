import type { Venue } from "@/types/venue";
import type { Program } from "@/types/schedule";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";
import "dayjs/locale/fr-ca";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

/** Collapse any BCP-47 tag (e.g. "fr-CA") to a supported UI locale. */
function uiLocale(locale: string | undefined): "en" | "fr" {
  return (locale ?? "").toLowerCase().startsWith("fr") ? "fr" : "en";
}

/** dayjs locale per UI locale; French uses the Quebec (Canada) locale. */
const DAYJS_LOCALE = { en: "en", fr: "fr-ca" } as const;

/** The dayjs locale that matches a UI locale or BCP-47 tag. */
export function dayjsLocale(locale: string | undefined): string {
  return DAYJS_LOCALE[uiLocale(locale)];
}

const DATE_FORMATS = {
  event: { en: "dddd, MMMM D", fr: "dddd D MMMM" },
  human: { en: "ddd, MMM D", fr: "ddd D MMM" },
  updated: { en: "MMM D, YYYY", fr: "D MMM YYYY" },
} as const;


export function getTodayInVenueTime(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

export function isProgramNotEnded(end: string, timezone: string): boolean {
  return !dayjs.tz(end, timezone).isBefore(dayjs().tz(timezone));
}

/** True when the program is running right now (venue-local), inclusive of its end. */
export function isProgramInProgress(
  program: Program,
  timezone: string
): boolean {
  const now = dayjs().tz(timezone);
  return (
    !dayjs.tz(program.start, timezone).isAfter(now) &&
    !dayjs.tz(program.end, timezone).isBefore(now)
  );
}

/** Whole minutes from now until the program's end (venue-local), floored at 0. */
export function minutesUntilEnd(end: string, timezone: string): number {
  const now = dayjs().tz(timezone);
  return Math.max(0, Math.ceil(dayjs.tz(end, timezone).diff(now, "minute", true)));
}

export function getCurrentMinutesInVenueTime(timezone: string): number {
  const now = dayjs().tz(timezone);
  return now.hour() * 60 + now.minute();
}

export function getUpcomingEvents(
  venue: Venue,
  from?: string,
  to?: string
): Program[] {
  const start = from ?? getTodayInVenueTime(venue.timezone);
  return venue.schedule.programs
    .filter(
      (program) =>
        program.end > start && (to === undefined || program.start <= to)
    )
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function formatEventDate(
  dateStr: string,
  timezone: string,
  locale?: string
): string {
  const l = uiLocale(locale);
  return dayjs.tz(dateStr, timezone).locale(DAYJS_LOCALE[l]).format(DATE_FORMATS.event[l]);
}

export function formatHumanDate(
  dateStr: string,
  timezone: string,
  locale?: string
): string {
  const l = uiLocale(locale);
  return dayjs.tz(dateStr, timezone).locale(DAYJS_LOCALE[l]).format(DATE_FORMATS.human[l]);
}

/** Whether the browser's locale uses a 12-hour clock (respecting OS/browser settings). */
const BROWSER_HOUR12 = (() => {
  try {
    const resolved = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
    }).resolvedOptions();
    return (
      resolved.hour12 ??
      (resolved.hourCycle === "h11" || resolved.hourCycle === "h12")
    );
  } catch {
    return true;
  }
})();

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)}\u2013${formatTime(end)}`;
}

/**
 * Format a schedule time ("YYYY-MM-DDTHH:mm") using the browser's locale clock,
 * so the hour follows the user's 12- or 24-hour preference (with AM/PM as needed).
 */
export function formatTime(value: string): string {
  return dayjs(value).format(BROWSER_HOUR12 ? "h:mm A" : "HH:mm");
}

/** Short hour label for a timeline axis, e.g. "2pm" or "14". */
export function formatHourLabel(hour: number): string {
  return dayjs().hour(hour).minute(0).format(BROWSER_HOUR12 ? "ha" : "HH");
}

/** Format an ISO UTC timestamp (e.g. schedule.updatedAt) in the venue's timezone. */
export function formatUpdatedDate(
  updatedAt: string,
  timezone: string,
  locale?: string
): string {
  const l = uiLocale(locale);
  const d = dayjs(updatedAt).tz(timezone).locale(DAYJS_LOCALE[l]);
  const time = d.format(BROWSER_HOUR12 ? "h:mm A" : "HH:mm");
  return `${d.format(DATE_FORMATS.updated[l])} ${time}`;
}

/** Whole hours and remaining minutes between two "HH:mm" times. */
export function durationParts(
  start: string,
  end: string
): { hours: number; minutes: number } {
  const startMin = toMinutes(start.slice(11, 16));
  const endMin = toMinutes(end.slice(11, 16));
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60;
  return { hours: Math.floor(diff / 60), minutes: diff % 60 };
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function geoUrl(lat: number, lon: number): string {
  return `geo:${lat},${lon}`;
}

export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
