"use client";

import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import type { Program } from "@/types/schedule";
import {
  getCurrentMinutesInArenaTime,
  getTodayInArenaTime,
  toMinutes,
} from "@/lib/schedule";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

function getWeekStartISO(programs: Program[]): string {
  return dayjs(programs[0].start)
    .startOf("week")
    .format("YYYY-MM-DD");
}

type WeekColumn = {
  key: string;
  date: string;
  programs: Program[];
};

function buildWeekColumns(
  programs: Program[],
  weekOffset = 0
): WeekColumn[] {
  const byDate = new Map<string, Program[]>();
  for (const p of programs) {
    const date = p.start.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(p);
  }

  const start = dayjs(getWeekStartISO(programs)).add(weekOffset, "week");

  const cols: WeekColumn[] = [];
  for (let i = 0; i < 7; i++) {
    const d = start.add(i, "day");
    const iso = d.format("YYYY-MM-DD");
    const programs = byDate.get(iso) ?? [];
    if (programs.length > 0) {
      programs.sort(
        (a, b) =>
          toMinutes(a.start) - toMinutes(b.start) ||
          a.name.localeCompare(b.name)
      );
    }
    cols.push({ key: iso, date: iso, programs });
  }
  return cols;
}

function computeTimeRange(columns: WeekColumn[]): {
  startHour: number;
  endHour: number;
} {
  let min = 24;
  let max = 0;
  for (const col of columns) {
    for (const p of col.programs) {
      const s = parseInt(p.start.slice(11, 13));
      const e = parseInt(p.end.slice(11, 13));
      if (s < min) min = s;
      if (e > max) max = e;
    }
  }
  if (min === 24) {
    return { startHour: 8, endHour: 21 };
  }
  return {
    startHour: Math.max(0, min - 1),
    endHour: Math.min(23, max + 1),
  };
}

export function WeekView({
  programs,
  timezone,
  bodyRef,
}: {
  programs: Program[];
  timezone: string;
  bodyRef: RefObject<HTMLDivElement | null>;
}) {
  const baseWeekStart = useMemo(() => getWeekStartISO(programs), [programs]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);

  const columns = useMemo(
    () => buildWeekColumns(programs, weekOffset),
    [programs, weekOffset]
  );

  const timeRange = useMemo(() => computeTimeRange(columns), [columns]);

  const totalMinutes = (timeRange.endHour - timeRange.startHour) * 60;
  const rangeStartMinutes = timeRange.startHour * 60;

  const [nowMinutes, setNowMinutes] = useState(() =>
    getCurrentMinutesInArenaTime(timezone)
  );

  useEffect(() => {
    const id = setInterval(
      () => setNowMinutes(getCurrentMinutesInArenaTime(timezone)),
      60_000
    );
    return () => clearInterval(id);
  }, [timezone]);

  const todayISO = getTodayInArenaTime(timezone);
  const hasToday = columns.some((col) => col.date === todayISO);
  const nowPct = ((nowMinutes - rangeStartMinutes) / totalMinutes) * 100;
  const showNow = hasToday && nowPct >= 0 && nowPct <= 100;

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setBodyHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bodyRef]);

  const pixelsPerMinute =
    bodyHeight > 0 && totalMinutes > 0
      ? Math.max(bodyHeight / totalMinutes, 1.5)
      : 1.5;

  const timelineHeight = totalMinutes * pixelsPerMinute;

  const hourPositions = useMemo(() => {
    const positions: { hour: number; pct: number }[] = [];
    for (let h = timeRange.startHour; h <= timeRange.endHour; h++) {
      positions.push({
        hour: h,
        pct: ((h - timeRange.startHour) * 60 / totalMinutes) * 100,
      });
    }
    return positions;
  }, [timeRange, totalMinutes]);

  const weekStart = dayjs(baseWeekStart).add(weekOffset, "week");
  const weekEnd = weekStart.add(6, "day");
  const label =
    weekStart.month() === weekEnd.month()
      ? weekStart.format("MMM D") + " – " + weekEnd.format("MMM D")
      : weekStart.format("MMM D") + " – " + weekEnd.format("MMM D, YYYY");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label="Previous week"
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </span>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="rounded-md px-2 py-0.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              This week
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Next week"
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="week-calendar min-w-0 flex-1 overflow-auto" style={{ maxHeight: "55vh" }}>
        <div className="week-calendar__header grid grid-cols-subgrid col-span-full">
          <div className="border-b border-black/[.08] dark:border-white/[.1]" />
          {columns.map((col) => (
            <div
              key={col.key}
              className="border-b border-black/[.08] px-1 pb-2 text-center text-xs font-medium text-zinc-700 dark:border-white/[.1] dark:text-zinc-300"
            >
              {WEEKDAY_LABELS[dayjs(`${col.date}T00:00`).day()]}
              <br />
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {dayjs(`${col.date}T00:00`).format("MMM D")}
              </span>
            </div>
          ))}
        </div>

        <div className="relative grid grid-cols-subgrid col-span-full" style={{ height: Math.max(timelineHeight, 300) }}>
          <div className="relative">
            {hourPositions.map(({ hour, pct }) => (
              <div
                key={hour}
                className="absolute right-2 text-[10px] text-zinc-400 dark:text-zinc-500 -translate-y-1/2"
                style={{ top: `${pct}%` }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {columns.map((col, ci) => (
            <div
              key={col.key}
              className={`relative overflow-hidden ${
                ci > 0 ? "border-l border-black/[.04] dark:border-white/[.06]" : ""
              }`}
            >
              {hourPositions.map(({ hour, pct }) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-black/[.04] dark:border-white/[.06]"
                  style={{ top: `${pct}%` }}
                />
              ))}

              {col.programs.map((p) => {
                const startM = toMinutes(p.start.slice(11, 16));
                const endM = toMinutes(p.end.slice(11, 16));
                const topPct = ((startM - rangeStartMinutes) / totalMinutes) * 100;
                const heightPct = Math.max(
                  ((endM - startM) / totalMinutes) * 100,
                  2.5
                );
                return (
                  <div
                    key={p.id}
                    className="absolute left-0 right-0 overflow-hidden rounded-md border border-black/[.06] bg-white px-1 py-0.5 text-[11px] leading-tight dark:border-white/[.08] dark:bg-zinc-950"
                    style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                  >
                    <div className="tabular-nums text-zinc-500 dark:text-zinc-400">
                      {p.start.slice(11, 16)}–{p.end.slice(11, 16)}
                    </div>
                    <div className="truncate">{p.name}</div>
                  </div>
                );
              })}
            </div>
          ))}

          {showNow && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-20 -translate-y-1/2 flex items-center"
              style={{ top: `${nowPct}%`, left: "2.5rem", right: 0 }}
            >
              <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-red-500 dark:bg-red-400" />
              <span className="-ml-1 h-px flex-1 bg-red-500 dark:bg-red-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
