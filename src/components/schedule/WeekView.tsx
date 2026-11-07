"use client";

import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { Program } from "@/types/schedule";
import {
  dayjsLocale,
  formatHourLabel,
  formatTimeRange,
  getCurrentMinutesInVenueTime,
  getTodayInVenueTime,
  toMinutes,
} from "@/lib/schedule";
import { normalizeLocale, type Locale } from "@/i18n/config";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/fr-ca";

const SHORT_DATE_FORMAT: Record<Locale, string> = {
  en: "MMM D",
  fr: "D MMM",
};

function getWeekStartISO(programs: Program[]): string {
  return dayjs(programs[0].start)
    .startOf("week")
    .format("YYYY-MM-DD");
}

type PositionedProgram = {
  program: Program;
  /** Zero-based column within its overlap group. */
  lane: number;
  /** Number of columns in its overlap group. */
  lanes: number;
};

type WeekColumn = {
  key: string;
  date: string;
  programs: PositionedProgram[];
};

const startMinutes = (program: Program) =>
  toMinutes(program.start.slice(11, 16));
const endMinutes = (program: Program) =>
  toMinutes(program.end.slice(11, 16));

/**
 * Assigns overlapping programs to side-by-side lanes so concurrent programs
 * render next to each other instead of on top of one another. Overlapping
 * programs are clustered first, then greedily packed into the first lane that
 * is free; every program in a cluster shares the cluster's lane count so they
 * all have the same width.
 */
function layoutPrograms(programs: Program[]): PositionedProgram[] {
  const sorted = [...programs].sort(
    (a, b) =>
      startMinutes(a) - startMinutes(b) ||
      endMinutes(b) - endMinutes(a) ||
      a.name.localeCompare(b.name)
  );

  const result: PositionedProgram[] = [];
  let cluster: Program[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();
    for (const program of cluster) {
      const start = startMinutes(program);
      let lane = laneEnds.findIndex((end) => end <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(endMinutes(program));
      } else {
        laneEnds[lane] = endMinutes(program);
      }
      laneOf.set(program.id, lane);
    }
    const lanes = laneEnds.length;
    for (const program of cluster) {
      result.push({ program, lane: laneOf.get(program.id) ?? 0, lanes });
    }
    cluster = [];
  };

  for (const program of sorted) {
    const start = startMinutes(program);
    if (cluster.length > 0 && start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push(program);
    clusterEnd = Math.max(clusterEnd, endMinutes(program));
  }
  flush();

  return result;
}

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
    cols.push({
      key: iso,
      date: iso,
      programs: layoutPrograms(byDate.get(iso) ?? []),
    });
  }
  return cols;
}

function computeTimeRange(
  columns: WeekColumn[],
  nowMinutes: number | null = null
): {
  startHour: number;
  endHour: number;
} {
  let min = 24;
  let max = 0;
  for (const col of columns) {
    for (const { program } of col.programs) {
      const s = parseInt(program.start.slice(11, 13));
      const e = parseInt(program.end.slice(11, 13));
      if (s < min) min = s;
      if (e > max) max = e;
    }
  }
  if (nowMinutes !== null) {
    min = Math.min(min, Math.floor(nowMinutes / 60));
    max = Math.max(max, Math.ceil(nowMinutes / 60));
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
  const { t, i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage);
  const baseWeekStart = useMemo(() => getWeekStartISO(programs), [programs]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);

  const columns = useMemo(
    () => buildWeekColumns(programs, weekOffset),
    [programs, weekOffset]
  );

  const [nowMinutes, setNowMinutes] = useState(() =>
    getCurrentMinutesInVenueTime(timezone)
  );

  useEffect(() => {
    const id = setInterval(
      () => setNowMinutes(getCurrentMinutesInVenueTime(timezone)),
      60_000
    );
    return () => clearInterval(id);
  }, [timezone]);

  const todayISO = getTodayInVenueTime(timezone);
  const hasToday = columns.some((col) => col.date === todayISO);

  const timeRange = useMemo(
    () => computeTimeRange(columns, hasToday ? nowMinutes : null),
    [columns, hasToday, nowMinutes]
  );

  const totalMinutes = (timeRange.endHour - timeRange.startHour) * 60;
  const rangeStartMinutes = timeRange.startHour * 60;

  const nowPct = Math.min(
    100,
    Math.max(0, ((nowMinutes - rangeStartMinutes) / totalMinutes) * 100)
  );
  const showNow = hasToday;

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
      ? weekStart.locale(dayjsLocale(locale)).format(SHORT_DATE_FORMAT[locale]) +
        " – " +
        weekEnd.locale(dayjsLocale(locale)).format(SHORT_DATE_FORMAT[locale])
      : weekStart.locale(dayjsLocale(locale)).format(SHORT_DATE_FORMAT[locale]) +
        " – " +
        weekEnd
          .locale(dayjsLocale(locale))
          .format(`${SHORT_DATE_FORMAT[locale]}, YYYY`);

  return (
    <div className="flex flex-col">
      <div className="sticky top-12 z-20 -mx-5 flex h-10 items-center justify-between gap-2 bg-popover px-5">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label={t("week.previous")}
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
              {t("week.thisWeek")}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label={t("week.next")}
          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="week-calendar min-w-0">
        <div className="week-calendar__header grid grid-cols-subgrid col-span-full">
          <div className="border-b border-black/[.08] dark:border-white/[.1]" />
          {columns.map((col) => (
            <div
              key={col.key}
              className="border-b border-black/[.08] px-1 pb-2 text-center text-xs font-medium text-zinc-700 dark:border-white/[.1] dark:text-zinc-300"
            >
              {dayjs(`${col.date}T00:00`).locale(dayjsLocale(locale)).format("ddd")}
              <br />
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {dayjs(`${col.date}T00:00`)
                  .locale(dayjsLocale(locale))
                  .format(SHORT_DATE_FORMAT[locale])}
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
                {formatHourLabel(hour)}
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

              {col.programs.map(({ program: p, lane, lanes }) => {
                const startM = toMinutes(p.start.slice(11, 16));
                const endM = toMinutes(p.end.slice(11, 16));
                const topPct = ((startM - rangeStartMinutes) / totalMinutes) * 100;
                const heightPct = Math.max(
                  ((endM - startM) / totalMinutes) * 100,
                  2.5
                );
                const width = 100 / lanes;
                return (
                  <div
                    key={p.id}
                    className="absolute flex flex-col overflow-hidden rounded-md border border-black/[.06] bg-white px-1 py-0.5 text-[11px] leading-tight dark:border-white/[.08] dark:bg-zinc-950"
                    style={{
                      top: `${topPct}%`,
                      height: `${heightPct}%`,
                      left: `${lane * width}%`,
                      width: `calc(${width}% - 1px)`,
                    }}
                  >
                    <div className="truncate tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatTimeRange(p.start, p.end)}
                    </div>
                    <div className="min-h-0 flex-1">
                      <div className="line-clamp-2">{p.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {showNow && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-0 -translate-y-1/2 flex items-center"
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
