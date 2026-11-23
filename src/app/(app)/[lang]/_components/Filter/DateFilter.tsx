"use client";

import { useEffect, useId, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/fr-ca";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { normalizeLocale, type Locale } from "@/i18n/locales";
import { dayjsLocale, formatTime } from "@/lib/schedule";
import { useSkatingAppData } from "@/app/(app)/[lang]/_components/SkatingAppDataProvider";
import { IconCalendarWeek, IconCalendar } from "@tabler/icons-react";

/**
 * Longest selectable date range: one week (7 days inclusive).
 * react-day-picker's `max` counts the calendar-day difference between the two
 * endpoints, so seven inclusive days corresponds to a difference of six.
 */
const MAX_RANGE_DAYS = 7;

/**
 * One-click time presets. Each applies to the currently selected date(s), or to
 * today when no date has been picked, replacing both the from and to times.
 */
const QUICK_PERIODS = [
  { key: "allDay", from: "00:00", to: "23:59" },
  { key: "morning", from: "06:00", to: "12:00" },
  { key: "afternoon", from: "12:00", to: "17:00" },
  { key: "evening", from: "17:00", to: "23:59" },
] as const;

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

function formatDate(
  value: string,
  now: Date | null,
  t: TFunction,
  locale: Locale
): string {
  const d = dayjs(value).locale(dayjsLocale(locale));
  const isToday =
    !!now && d.format("YYYY-MM-DD") === dayjs(now).format("YYYY-MM-DD");
  if (isToday) return t("filters.today");
  return d.format(locale === "fr" ? "D MMM" : "MMM D");
}

function formatDateTime(
  value: string,
  now: Date | null,
  t: TFunction,
  locale: Locale
): string {
  const time = formatTime(value);
  const isToday =
    !!now &&
    dayjs(value).format("YYYY-MM-DD") === dayjs(now).format("YYYY-MM-DD");
  if (isToday) return `${t("filters.today")} ${time}`;
  return `${formatDate(value, now, t, locale)}, ${time}`;
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
  if (from && to) {
    const fromD = dayjs(from);
    const toD = dayjs(to);
    const fromIsToday =
      !!now && fromD.format("YYYY-MM-DD") === dayjs(now).format("YYYY-MM-DD");
    const toLabel =
      !fromIsToday && fromD.isSame(toD, "month")
        ? toD.format("D")
        : formatDate(to, now, t, locale);
    return `${formatDate(from, now, t, locale)} - ${toLabel}, ${formatTime(from)} - ${formatTime(to)}`;
  }
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

export function DateFilter() {
  const { t, i18n } = useTranslation();
  const {
    fromDate: from,
    toDate: to,
    setFromDate: onFromChange,
    setToDate: onToChange,
    resetDateRange: onClear,
  } = useSkatingAppData();
  const locale = normalizeLocale(i18n.resolvedLanguage);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const active = Boolean(from || to);
  const fromTimeId = useId();
  const toTimeId = useId();

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

  const commit = (
    range: DateRange | undefined,
    fromTime: string,
    toTime: string
  ) => {
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

  const applyQuickPeriod = (fromTime: string, toTime: string) => {
    setPendingFromTime(fromTime);
    setPendingToTime(toTime);
    setFromTimeTouched(true);
  };

  const handleSelect = (range: DateRange | undefined) => {
    setPendingRange(range);
  };

  const pendingFrom = pendingRange?.from;
  const pendingTo = pendingRange?.to ?? pendingFrom;
  const pendingLabel = displayLabel(
    pendingFrom ? `${toLocalDateStr(pendingFrom)}T${pendingFromTime}` : "",
    pendingTo ? `${toLocalDateStr(pendingTo)}T${pendingToTime}` : "",
    now,
    t,
    locale
  );

  const activePeriod = QUICK_PERIODS.find(
    (period) =>
      period.from === pendingFromTime && period.to === pendingToTime
  )?.key;

  return (
    <DateRangePicker
      value={pendingRange}
      onChange={handleSelect}
      open={open}
      onOpenChange={setOpen}
      max={MAX_RANGE_DAYS - 1}
      variant="outline"
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
            <span className="ml-0.5 size-1.5 shrink-0 rounded-full bg-brand" />
          )}
        </>
      }
      drawerTitle={pendingLabel}
    >
      <div className="space-y-3 border-t px-3 py-3">
        <div
          role="group"
          aria-label={t("filters.timeOfDay")}
          className="flex gap-2"
        >
          {QUICK_PERIODS.map((period) => {
            const isActive = activePeriod === period.key;
            return (
              <Button
                key={period.key}
                variant={isActive ? "secondary" : "outline"}
                size="lg"
                className="flex-1 px-2"
                aria-pressed={isActive}
                onClick={() => applyQuickPeriod(period.from, period.to)}
              >
                {t(`filters.${period.key}`)}
              </Button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label
            htmlFor={fromTimeId}
            className="flex flex-col gap-1 text-[11px] text-muted-foreground"
          >
            {t("filters.from")}
            <input
              id={fromTimeId}
              type="time"
              value={pendingFromTime}
              onChange={(e) => {
                setPendingFromTime(e.target.value);
                setFromTimeTouched(true);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <label
            htmlFor={toTimeId}
            className="flex flex-col gap-1 text-[11px] text-muted-foreground"
          >
            {t("filters.to")}
            <input
              id={toTimeId}
              type="time"
              value={pendingToTime}
              onChange={(e) => setPendingToTime(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t px-3 py-2">
        <Button
          variant="outline"
          size="lg"
          className="px-3"
          onClick={() => {
            const now = todayLocalISO();
            const fromDate = new Date();
            commit({ from: fromDate, to: fromDate }, now.slice(11, 16), "23:59");
          }}
        >
          {t("filters.upcoming")}
        </Button>
        <Button
          variant="default"
          size="lg"
          className="ml-auto px-4"
          onClick={() => commit(pendingRange, pendingFromTime, pendingToTime)}
        >
          {t("filters.ok")}
        </Button>
      </div>
    </DateRangePicker>
  );
}
