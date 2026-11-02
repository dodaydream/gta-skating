import type { Venue } from "@/types/venue";
import type { Program } from "@/types/schedule";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

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
        program.end >= start && (to === undefined || program.start <= to)
    )
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function formatEventDate(dateStr: string, timezone: string): string {
  return dayjs.tz(dateStr, timezone).format("dddd, MMMM D");
}

export function formatHumanDate(dateStr: string, timezone: string): string {
  const today = getTodayInVenueTime(timezone);
  if (dateStr.slice(0, 10) === today) return "Today";
  return dayjs.tz(dateStr, timezone).format("ddd, MMM D");
}

export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(11, 16)}\u2013${end.slice(11, 16)}`;
}

/** Format an ISO UTC timestamp (e.g. schedule.updatedAt) in the venue's timezone. */
export function formatUpdatedDate(updatedAt: string, timezone: string): string {
  return dayjs(updatedAt).tz(timezone).format("MMM D, YYYY h:mm A");
}

/** Human label for a program's drop-in price: "Free", "$5.90", or null when unknown. */
export function formatTicket(ticket: number | undefined): string | null {
  if (ticket === undefined) return null;
  if (ticket <= 0) return "Free";
  return `$${ticket.toFixed(2)}`;
}

export function formatDuration(start: string, end: string): string {
  const startMin = toMinutes(start.slice(11, 16));
  const endMin = toMinutes(end.slice(11, 16));
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function osmUrl(
  lat: number,
  lon: number,
  zoom: number = 17
): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
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
