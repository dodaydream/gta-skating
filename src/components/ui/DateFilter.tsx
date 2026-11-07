"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/fr-ca";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import type { ProgramType } from "@/types/schedule";
import type { RinkEnvironment, VenueDisplay } from "@/types/venue";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { FiltersControl } from "@/components/ui/FiltersControl";
import { normalizeLocale, type Locale } from "@/i18n/config";
import { dayjsLocale, formatTime } from "@/lib/schedule";
import {
  IconCalendarWeek,
  IconCalendar,
  IconEyeFilled,
  IconEyeOff,
  IconStarFilled,
} from "@tabler/icons-react";

interface FilterChipsProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear: () => void;
  venueDisplay: VenueDisplay;
  onVenueDisplayChange: (venueDisplay: VenueDisplay) => void;
  types: ProgramType[];
  onTypesChange: (types: ProgramType[]) => void;
  rinkTypes: RinkEnvironment[];
  onRinkTypesChange: (rinkTypes: RinkEnvironment[]) => void;
  amenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  sortBy: "time" | "distance";
  onSortChange: (sortBy: "time" | "distance") => void;
  hasLocation: boolean;
  className?: string;
}

/**
 * Longest selectable date range: one week (7 days inclusive).
 * react-day-picker's `max` counts the calendar-day difference between the two
 * endpoints, so seven inclusive days corresponds to a difference of six.
 */
const MAX_RANGE_DAYS = 7;

const VENUE_DISPLAY_OPTIONS: { value: VenueDisplay; labelKey: string }[] = [
  { value: "favorites", labelKey: "filters.favoritesOnly" },
  { value: "withPrograms", labelKey: "filters.withPrograms" },
  { value: "all", labelKey: "filters.allVenues" },
];

function VenueDisplayIcon({ value }: { value: VenueDisplay }) {
  if (value === "favorites") {
    return <IconStarFilled className="size-4 text-amber-500" />;
  }
  if (value === "withPrograms") {
    return <IconEyeOff className="size-4" />;
  }
  return <IconEyeFilled className="size-4 text-blue-500" />;
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(
  value: string,
  now: Date | null,
  t: TFunction,
  locale: Locale
): string {
  const d = dayjs(value).locale(dayjsLocale(locale));
  const time = formatTime(value);
  const isToday =
    !!now && d.format("YYYY-MM-DD") === dayjs(now).format("YYYY-MM-DD");
  if (isToday) return `${t("filters.today")} ${time}`;
  return `${d.format(locale === "fr" ? "D MMM" : "MMM D")}, ${time}`;
}

function displayLabel(
  from: string,
  to: string,
  now: Date | null,
  t: TFunction,
  locale: Locale
): string {
  if (from && to && dayjs(from).isSame(dayjs(to), "day"))
    return `${formatDateTime(from, now, t, locale)} - ${formatTime(to)}`;
  if (from && to)
    return `${formatDateTime(from, now, t, locale)} - ${formatDateTime(to, now, t, locale)}`;
  if (from)
    return t("filters.fromDate", {
      value: formatDateTime(from, now, t, locale),
    });
  if (to)
    return t("filters.untilDate", {
      value: formatDateTime(to, now, t, locale),
    });
  return t("filters.anytime");
}

export function FilterChips({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  venueDisplay,
  onVenueDisplayChange,
  types,
  onTypesChange,
  rinkTypes,
  onRinkTypesChange,
  amenities,
  onAmenitiesChange,
  sortBy,
  onSortChange,
  hasLocation,
  className = "",
}: FilterChipsProps) {
  const { t, i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const active = Boolean(from || to);

  const venueDisplayIndex = VENUE_DISPLAY_OPTIONS.findIndex(
    (option) => option.value === venueDisplay
  );
  const currentVenueDisplay =
    VENUE_DISPLAY_OPTIONS[venueDisplayIndex] ?? VENUE_DISPLAY_OPTIONS[0];

  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(
    fromDate || toDate ? { from: fromDate, to: toDate } : undefined
  );

  const [pendingFromTime, setPendingFromTime] = useState(from?.slice(11, 16) ?? "00:00");
  const [pendingToTime, setPendingToTime] = useState(to?.slice(11, 16) ?? "23:59");
  const [fromTimeTouched, setFromTimeTouched] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    setPendingRange(fromDate || toDate ? { from: fromDate, to: toDate } : undefined);
    setPendingFromTime(from?.slice(11, 16) ?? "00:00");
    setPendingToTime(to?.slice(11, 16) ?? "23:59");
    setFromTimeTouched(false);
  }, [from, to]);

  const commit = (range: DateRange | undefined, fromTime: string, toTime: string) => {
    if (!range || !range.from) {
      onClear();
      return;
    }
    const todayStr = todayLocalISO().slice(0, 10);
    const nowTime = todayLocalISO().slice(11, 16);
    const fromIsToday = toLocalDateStr(range.from) === todayStr;
    const fromStr = `${toLocalDateStr(range.from)}T${
      fromIsToday && !fromTimeTouched ? nowTime : fromTime
    }`;
    const toStr = range.to
      ? `${toLocalDateStr(range.to)}T${toTime}`
      : fromIsToday
        ? `${todayStr}T23:59`
        : "";
    if (fromStr !== from) onFromChange(fromStr);
    if (toStr !== to) onToChange(toStr);
    setOpen(false);
  };

  const handleSelect = (range: DateRange | undefined) => {
    setPendingRange(range);
  };

  return (
    <div className={`flex items-center gap-1.5 lg:gap-2 ${className}`}>
      <DateRangePicker
        value={pendingRange}
        onChange={handleSelect}
        open={open}
        onOpenChange={setOpen}
        max={MAX_RANGE_DAYS - 1}
        variant="secondary"
        size="lg"
        className="shadow-xs min-w-0 flex-1 md:flex-none"
        trigger={
          <>
            {active ? (
              <IconCalendarWeek className="size-4" />
            ) : (
              <IconCalendar className="size-4" />
            )}
            <span className="truncate">
              {displayLabel(from, to, now, t, locale)}
            </span>
            {active && (
              <span className="ml-0.5 size-1.5 shrink-0 rounded-full bg-blue-500" />
            )}
          </>
        }
        drawerTitle={displayLabel(from, to, now, t, locale)}
      >
          <div className="flex items-center gap-2 border-t px-3 py-2">
            <div className="flex flex-1 items-center gap-1">
              <label className="w-8 shrink-0 text-[11px] text-muted-foreground">
                {t("filters.from")}
              </label>
              <input
                type="time"
                value={pendingFromTime}
                onChange={(e) => {
                  setPendingFromTime(e.target.value);
                  setFromTimeTouched(true);
                }}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-1 items-center gap-1">
              <label className="w-4 shrink-0 text-[11px] text-muted-foreground">
                {t("filters.to")}
              </label>
              <input
                type="time"
                value={pendingToTime}
                onChange={(e) => setPendingToTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex gap-2 border-t px-3 py-2 lg:justify-start">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 lg:flex-none lg:size-sm"
              onClick={() => {
                const now = todayLocalISO();
                const fromDate = new Date();
                commit({ from: fromDate, to: fromDate }, now.slice(11, 16), "23:59");
              }}
            >
              {t("filters.today")}
            </Button>
            <Button
              variant="default"
              size="lg"
              className="flex-1 lg:flex-none lg:ml-auto"
              onClick={() => commit(pendingRange, pendingFromTime, pendingToTime)}
            >
              {t("filters.ok")}
            </Button>
          </div>
      </DateRangePicker>

      <FiltersControl
        types={types}
        onTypesChange={onTypesChange}
        rinkTypes={rinkTypes}
        onRinkTypesChange={onRinkTypesChange}
        amenities={amenities}
        onAmenitiesChange={onAmenitiesChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        hasLocation={hasLocation}
      />

      <Button
        variant="secondary"
        size="icon-lg"
        className="shadow-xs"
        data-slot="venue-display"
        aria-label={t(currentVenueDisplay.labelKey)}
        title={t(currentVenueDisplay.labelKey)}
        onClick={() => {
          const next =
            VENUE_DISPLAY_OPTIONS[
              (venueDisplayIndex + 1) % VENUE_DISPLAY_OPTIONS.length
            ];
          onVenueDisplayChange(next.value);
        }}
      >
        <VenueDisplayIcon value={currentVenueDisplay.value} />
      </Button>
    </div>
  );
}