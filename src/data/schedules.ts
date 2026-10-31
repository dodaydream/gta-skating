import type { Arena } from "@/types/arena";
import type { ArenaEvent } from "@/types/schedule";
import dayjs from "dayjs";

import gta from "./schedule.json";
import billBolton from "./bill-bolton.json";
import agincourt from "./agincourt.json";
import albion from "./albion.json";
import amesbury from "./amesbury-sports-complex.json";
import angelaJames from "./angela-james.json";
import baycrest from "./baycrest.json";
import bayview from "./bayview.json";
import bondLake from "./bond-lake-arena.json";
import centennialEtobicoke from "./centennial-park-etobicoke.json";
import centennialScarborough from "./centennial-scarborough.json";
import central from "./central.json";
import chrisTonks from "./chris-tonks.json";
import commander from "./commander.json";
import cummerPark from "./cummer-park.json";
import donMillsCivitan from "./don-mills-civitan.json";
import donMontgomery from "./don-montgomery.json";
import downsview from "./downsview.json";
import eastYorkMemorial from "./east-york-memorial.json";
import edSackfield from "./ed-sackfield-arena.json";
import elginBarrow from "./elgin-barrow-arena.json";
import fenside from "./fenside.json";
import gordAndIreneRisk from "./gord-and-irene-risk.json";
import goulding from "./goulding.json";
import grandravine from "./grandravine-community.json";
import habitant from "./habitant.json";
import carnegie from "./herbert-h-carnegie-centennial-centre.json";
import heronPark from "./heron-park-community.json";
import johnBoothMemorial from "./john-booth-memorial.json";
import lambton from "./lambton.json";
import longBranch from "./long-branch.json";
import malvern from "./malvern.json";
import mcgregorPark from "./mcgregor-park.json";
import mimico from "./mimico.json";
import mitchellField from "./mitchell-field.json";
import oriole from "./oriole.json";
import parkLawnBubble from "./park-lawn-bubble-rink.json";
import philWhite from "./phil-white.json";
import pinePoint from "./pine-point.json";
import pleasantview from "./pleasantview.json";
import roding from "./roding.json";
import scarboroughGardens from "./scarborough-gardens.json";
import scarboroughVillage from "./scarborough-village.json";
import victoriaVillage from "./victoria-village.json";
import yorkMills from "./york-mills.json";

export const arenas: Arena[] = [
  gta as Arena,
  billBolton as Arena,
  agincourt as Arena,
  albion as Arena,
  amesbury as Arena,
  angelaJames as Arena,
  baycrest as Arena,
  bayview as Arena,
  centennialEtobicoke as Arena,
  centennialScarborough as Arena,
  central as Arena,
  chrisTonks as Arena,
  commander as Arena,
  cummerPark as Arena,
  donMillsCivitan as Arena,
  donMontgomery as Arena,
  downsview as Arena,
  eastYorkMemorial as Arena,
  fenside as Arena,
  gordAndIreneRisk as Arena,
  goulding as Arena,
  grandravine as Arena,
  habitant as Arena,
  carnegie as Arena,
  heronPark as Arena,
  johnBoothMemorial as Arena,
  lambton as Arena,
  longBranch as Arena,
  malvern as Arena,
  mcgregorPark as Arena,
  mimico as Arena,
  mitchellField as Arena,
  oriole as Arena,
  parkLawnBubble as Arena,
  philWhite as Arena,
  pinePoint as Arena,
  pleasantview as Arena,
  roding as Arena,
  scarboroughGardens as Arena,
  scarboroughVillage as Arena,
  victoriaVillage as Arena,
  yorkMills as Arena,
];

export function getTodayInArenaTime(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

export function getUpcomingEvents(
  arena: Arena,
  from?: string,
  to?: string
): ArenaEvent[] {
  const start = from ?? getTodayInArenaTime(arena.timezone);
  return arena.schedule.events
    .filter(
      (event) =>
        event.date >= start && (to === undefined || event.date <= to)
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatEventDate(date: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(`${date}T00:00`));
}

export function formatHumanDate(date: string, timezone: string): string {
  const today = getTodayInArenaTime(timezone);
  if (date === today) return "Today";
  return dayjs(`${date}T00:00`).format("ddd, MMM D");
}

export function formatTimeRange(start: string, end: string): string {
  return `${start}\u2013${end}`;
}

export function formatDuration(start: string, end: string): string {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
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