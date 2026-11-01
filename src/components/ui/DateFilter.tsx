"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import { IconCalendarWeek, IconCalendar } from "@tabler/icons-react";

interface FilterChipsProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear: () => void;
  hideEmpty: boolean;
  onHideEmptyChange: (v: boolean) => void;
  className?: string;
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

function formatDateTime(value: string, now: Date | null): string {
  const d = dayjs(value);
  const time = d.format("HH:mm");
  const isToday = !!now && d.format("YYYY-MM-DD") === dayjs(now).format("YYYY-MM-DD");
  return isToday ? `Today ${time}` : d.format("MMM D, HH:mm");
}

function displayLabel(from: string, to: string, now: Date | null): string {
  if (from && to && dayjs(from).isSame(dayjs(to), "day"))
    return `${formatDateTime(from, now)} - ${dayjs(to).format("HH:mm")}`;
  if (from && to) return `${formatDateTime(from, now)} - ${formatDateTime(to, now)}`;
  if (from) return `From ${formatDateTime(from, now)}`;
  if (to) return `Until ${formatDateTime(to, now)}`;
  return "Anytime";
}

export function FilterChips({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  hideEmpty,
  onHideEmptyChange,
  className = "",
}: FilterChipsProps) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const active = Boolean(from || to);

  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(
    fromDate || toDate ? { from: fromDate, to: toDate } : undefined
  );

  const [pendingFromTime, setPendingFromTime] = useState(from?.slice(11, 16) ?? "00:00");
  const [pendingToTime, setPendingToTime] = useState(to?.slice(11, 16) ?? "23:59");

  useEffect(() => {
    const id = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    setPendingRange(fromDate || toDate ? { from: fromDate, to: toDate } : undefined);
    setPendingFromTime(from?.slice(11, 16) ?? "00:00");
    setPendingToTime(to?.slice(11, 16) ?? "23:59");
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
      fromIsToday ? nowTime : fromTime
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
    <div className={`flex items-start gap-2 ${className}`}>
      <DateRangePicker
        value={pendingRange}
        onChange={handleSelect}
        open={open}
        onOpenChange={setOpen}
        variant="secondary"
        className="shadow-xs"
        trigger={
          <>
            {active ? (
              <IconCalendarWeek className="size-4 text-blue-500" />
            ) : (
              <IconCalendar className="size-4" />
            )}
            <span>{displayLabel(from, to, now)}</span>
            {active && <span className="ml-0.5 size-1.5 rounded-full bg-blue-500" />}
          </>
        }
        drawerTitle={displayLabel(from, to, now)}
      >
          <div className="flex items-center gap-2 border-t px-3 py-2">
            <div className="flex flex-1 items-center gap-1">
              <label className="w-8 shrink-0 text-[11px] text-muted-foreground">
                From
              </label>
              <input
                type="time"
                value={pendingFromTime}
                onChange={(e) => setPendingFromTime(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-1 items-center gap-1">
              <label className="w-4 shrink-0 text-[11px] text-muted-foreground">
                To
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
              Today
            </Button>
            <Button
              variant="default"
              size="lg"
              className="flex-1 lg:flex-none lg:ml-auto"
              onClick={() => commit(pendingRange, pendingFromTime, pendingToTime)}
            >
              OK
            </Button>
          </div>
      </DateRangePicker>

      <Button
        variant={hideEmpty ? "default" : "secondary"}
        size="default"
        className="shadow-xs"
        onClick={() => onHideEmptyChange(!hideEmpty)}
      >
        Programs
      </Button>
    </div>
  );
}