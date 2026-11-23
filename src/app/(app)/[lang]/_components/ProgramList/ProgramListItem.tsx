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
import {
  Item,
  ItemContent,
  ItemFooter,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";

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
    <Item
      data-slot="program-item"
      variant="outline"
      render={<button type="button" onClick={onSelect} />}
      className="gap-x-3 gap-y-1 rounded-xl bg-card px-4 py-3 text-left hover:bg-muted"
    >
      <ItemHeader className="text-xs tabular-nums text-muted-foreground">
        <span>
          {isToday
            ? `${t("programs.today")} · ${formatTimeRange(program.start, program.end)}`
            : `${formatHumanDate(program.start, program.venue.timezone, locale)} · ${formatTimeRange(program.start, program.end)}`}
        </span>
        <TicketBadge ticket={program.ticket} />
      </ItemHeader>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full min-w-0 truncate text-foreground">
          {program.name}
        </ItemTitle>
      </ItemContent>
      <ItemFooter className="text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">
          {venue.name}&nbsp;·&nbsp;
          {distance !== null && (
            <span className="text-muted-foreground">
              {formatDistance(distance)}
            </span>
          )}
        </span>
      </ItemFooter>
    </Item>
  );
}
