import type { Arena } from "@/types/arena";
import type { Program } from "@/types/schedule";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezonePlugin from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export function getTodayInArenaTime(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

export function isProgramNotEnded(end: string, timezone: string): boolean {
  return !dayjs.tz(end, timezone).isBefore(dayjs().tz(timezone));
}

export function getCurrentMinutesInArenaTime(timezone: string): number {
  const now = dayjs().tz(timezone);
  return now.hour() * 60 + now.minute();
}

export function getUpcomingEvents(
  arena: Arena,
  from?: string,
  to?: string
): Program[] {
  const start = from ?? getTodayInArenaTime(arena.timezone);
  return arena.schedule.programs
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
  const today = getTodayInArenaTime(timezone);
  if (dateStr.slice(0, 10) === today) return "Today";
  return dayjs.tz(dateStr, timezone).format("ddd, MMM D");
}

export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(11, 16)}\u2013${end.slice(11, 16)}`;
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
