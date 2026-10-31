"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Arena } from "@/types/arena";
import type { ArenaEvent } from "@/types/schedule";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatEventDate,
  formatTimeRange,
  getTodayInArenaTime,
  osmUrl,
  toMinutes,
} from "@/data/schedules";
import { X } from "lucide-react";
import dayjs from "dayjs";

type ViewMode = "list" | "week";

export function ArenaDetailModal({
  arena,
  onClose,
}: {
  arena: Arena;
  onClose: () => void;
}) {
  const events = arena.schedule.events;
  const updated = new Date(arena.schedule.updatedAt).toISOString().slice(0, 10);
  const [view, setView] = useState<ViewMode>("list");
  const weekBodyRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col overflow-hidden gap-4 p-0"
        style={{ maxWidth: "48rem" }}
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <DialogTitle className="text-lg">{arena.name}</DialogTitle>
            <DialogDescription>{arena.address}</DialogDescription>
          </div>
          <DialogClose
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </header>

        <TodayCards events={events} timezone={arena.timezone} />

        <div className="px-5">
          <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === "list"
                  ? "bg-white text-black shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              aria-pressed={view === "week"}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === "week"
                  ? "bg-white text-black shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Week
            </button>
          </div>
        </div>

        <div
          ref={weekBodyRef}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5"
        >
          {events.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming sessions.</p>
          ) : view === "list" ? (
            <ListView events={events} timezone={arena.timezone} />
) : (
            <WeekView events={events} bodyRef={weekBodyRef} />
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-black/[.06] px-5 py-3 text-xs text-zinc-500 dark:border-white/[.08] dark:text-zinc-400">
          {arena.url ? (
            <a
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              href={arena.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Arena website
            </a>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-3">
            {arena.coordinates ? (
              <a
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                href={osmUrl(arena.coordinates.lat, arena.coordinates.lon)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on map
              </a>
            ) : null}
            <span className="text-zinc-400">Updated {updated}</span>
          </span>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function TodayCards({
  events,
  timezone,
}: {
  events: ArenaEvent[];
  timezone: string;
}) {
  const today = getTodayInArenaTime(timezone);
  const programs = events.flatMap((event) =>
    event.programs.map((program) => ({ ...program, date: event.date }))
  );

  return (
    <div className="px-5">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {programs.map((program) => {
          const isToday = program.date === today;
          return (
            <div
              key={program.id}
              className={`flex w-full shrink-0 flex-col gap-1.5 rounded-xl border p-3 md:w-1/3 ${
                isToday
                  ? "border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/40"
                  : "border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950"
              }`}
            >
              <div className="flex items-center gap-2">
                <h3
                  className={`text-xs font-semibold ${
                    isToday
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {formatEventDate(program.date, timezone)}
                </h3>
                {isToday ? (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Today
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
                <li className="flex flex-col gap-0.5 py-1.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatTimeRange(program.start, program.end)}
                    </span>
                    <span className="text-sm text-black dark:text-zinc-50">
                      {program.name}
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  events,
  timezone,
}: {
  events: ArenaEvent[];
  timezone: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {events.map((event) => (
        <div key={event.date} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {formatEventDate(event.date, timezone)}
            </h3>
            <span className="flex-1 border-t border-dashed border-black/[.08] dark:border-white/[.1]" />
            <span className="text-xs text-zinc-400">
              {event.programs.length}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
            {event.programs.map((program) => (
              <li key={program.id} className="flex flex-col gap-1 py-2">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                    {formatTimeRange(program.start, program.end)}
                  </span>
                  <span className="text-black dark:text-zinc-50">
                    {program.name}
                  </span>
                </div>
                {program.notes ? (
                  <div className="w-full text-sm text-zinc-500 dark:text-zinc-400">
                    {program.notes}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WeekView({
  events,
  bodyRef,
}: {
  events: ArenaEvent[];
  bodyRef: RefObject<HTMLDivElement | null>;
}) {
  const baseWeekStart = useMemo(() => getWeekStartISO(events), [events]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);

  const columns = useMemo(
    () => buildWeekColumns(events, weekOffset),
    [events, weekOffset]
  );

  const timeRange = useMemo(() => computeTimeRange(columns), [columns]);

  const totalMinutes = (timeRange.endHour - timeRange.startHour) * 60;
  const rangeStartMinutes = timeRange.startHour * 60;

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

  const weekStart = dayjs(`${baseWeekStart}T00:00`).add(weekOffset, "week");
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
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
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
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <div className="flex">
          <div className="w-10 flex-shrink-0" />
          {columns.map((col) => (
            <div
              key={col.key}
              className="flex-1 border-b border-black/[.08] px-1 pb-2 text-center text-xs font-medium text-zinc-700 dark:border-white/[.1] dark:text-zinc-300"
            >
              {WEEKDAY_LABELS[dayjs(`${col.date}T00:00`).day()]}
              <br />
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {dayjs(`${col.date}T00:00`).format("MMM D")}
              </span>
            </div>
          ))}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
          <div className="flex" style={{ height: Math.max(timelineHeight, 300) }}>
            <div className="relative w-10 flex-shrink-0">
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
                className={`relative flex-1 ${
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
                  const startM = toMinutes(p.start);
                  const endM = toMinutes(p.end);
                  const topPct = ((startM - rangeStartMinutes) / totalMinutes) * 100;
                  const heightPct = Math.max(
                    ((endM - startM) / totalMinutes) * 100,
                    2.5
                  );
                  return (
                    <div
                      key={p.id}
                      className="absolute left-0.5 right-0.5 rounded-md border border-black/[.06] bg-white px-1 py-0.5 text-[11px] leading-tight dark:border-white/[.08] dark:bg-zinc-950 overflow-hidden"
                      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                    >
                      <div className="tabular-nums text-zinc-500 dark:text-zinc-400">
                        {p.start}–{p.end}
                      </div>
                      <div className="truncate">{p.name}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

function getWeekStartISO(events: ArenaEvent[]): string {
  const anchor = new Date(`${events[0].date}T00:00`);
  const start = new Date(anchor);
  const startDow = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - startDow);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

type WeekColumn = {
  key: string;
  date: string;
  programs: ArenaEvent["programs"];
};

function buildWeekColumns(
  events: ArenaEvent[],
  weekOffset = 0
): WeekColumn[] {
  const byDate = new Map<string, ArenaEvent["programs"]>();
  for (const event of events) {
    const existing = byDate.get(event.date);
    if (existing) {
      existing.push(...event.programs);
    } else {
      byDate.set(event.date, [...event.programs]);
    }
  }

  const start = dayjs(
    `${getWeekStartISO(events)}T00:00`
  ).add(weekOffset, "week");

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
      const s = parseInt(p.start.split(":")[0]);
      const e = parseInt(p.end.split(":")[0]);
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