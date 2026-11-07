"use client";

import { useTranslation } from "react-i18next";
import type { ProgramItem } from "@/types/schedule";
import {
  distanceKm,
  formatHumanDate,
  formatTimeRange,
  getTodayInVenueTime,
} from "@/lib/schedule";
import { normalizeLocale } from "@/i18n/locales";
import { TicketBadge } from "@/components/schedule/TicketBadge";

export function ProgramListItem({
  program,
  onSelect,
  userLocation,
}: {
  program: ProgramItem;
  onSelect: () => void;
  userLocation?: { lat: number; lon: number } | null;
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage);
  const venue = program.venue;
  const programDate = program.start.slice(0, 10);
  const isToday = programDate === getTodayInVenueTime(venue.timezone);
  const hasCoords =
    userLocation &&
    venue.coordinates &&
    isFinite(venue.coordinates.lat) &&
    isFinite(venue.coordinates.lon);
  const distance = hasCoords
    ? distanceKm(
        userLocation.lat,
        userLocation.lon,
        venue.coordinates.lat,
        venue.coordinates.lon
      )
    : null;

  return (
    <button
      type="button"
      data-slot="program-item"
      onClick={onSelect}
      className="flex flex-col gap-1 rounded-xl border border-black/[.08] bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-white/[.145] dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        <span className="font-mono">
          {isToday
            ? `${t("programs.today")}·${formatTimeRange(program.start, program.end)}`
            : `${formatHumanDate(program.start, program.venue.timezone, locale)}·${formatTimeRange(program.start, program.end)}`}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-black dark:text-zinc-50">
          {program.name}
        </span>
        <TicketBadge ticket={program.ticket} />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="min-w-0 truncate">
          {venue.name}&nbsp;·
          {distance !== null && (
            <span className="ml-1 text-zinc-400">
              {distance < 10 ? distance.toFixed(1) : Math.round(distance)} km
            </span>
          )}
        </span>
      </div>
    </button>
  );
}
