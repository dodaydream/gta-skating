"use client";

import { useTranslation } from "react-i18next";
import type { ProgramItem } from "@/types/schedule";
import {
  distanceKm,
  formatDistance,
  formatHumanDate,
  formatTimeRange,
  getTodayInVenueTime,
} from "@/lib/schedule";
import { normalizeLocale } from "@/i18n/locales";
import { useUserLocation } from "@/app/(app)/[lang]/_components/SkatingAppDataProvider";
import { TicketBadge } from "@/app/(app)/[lang]/@modal/venue/[slug]/_components/TicketBadge";

export function ProgramListItem({
  program,
  onSelect,
}: {
  program: ProgramItem;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();
  const userLocation = useUserLocation();
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
      className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-muted-foreground">
        <span className="font-mono">
          {isToday
            ? `${t("programs.today")}·${formatTimeRange(program.start, program.end)}`
            : `${formatHumanDate(program.start, program.venue.timezone, locale)}·${formatTimeRange(program.start, program.end)}`}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {program.name}
        </span>
        <TicketBadge ticket={program.ticket} />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {venue.name}&nbsp;·
          {distance !== null && (
            <span className="ml-1 text-muted-foreground">
              {formatDistance(distance)}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}
