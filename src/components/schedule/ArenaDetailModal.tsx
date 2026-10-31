"use client";

import { useRef, useState } from "react";
import type { Arena } from "@/types/arena";
import type { Program } from "@/types/schedule";
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
} from "@/lib/schedule";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WeekView } from "@/components/schedule/WeekView";
import { X } from "lucide-react";

export function ArenaDetailModal({
  arena,
  onClose,
}: {
  arena: Arena;
  onClose: () => void;
}) {
  const programs = arena.schedule.programs;
  const updated = new Date(arena.schedule.updatedAt).toISOString().slice(0, 10);
  const [view, setView] = useState<"day" | "week">("day");
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

        <TodayCards programs={programs} timezone={arena.timezone} />

        <div className="px-5">
          <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week")}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div
          ref={weekBodyRef}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5"
        >
{view === "day" ? (
            <ListView programs={programs} timezone={arena.timezone} />
          ) : programs.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming sessions.</p>
          ) : (
            <WeekView programs={programs} bodyRef={weekBodyRef} />
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
  programs,
  timezone,
}: {
  programs: Program[];
  timezone: string;
}) {
  const today = getTodayInArenaTime(timezone);

  return (
    <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden px-5 shrink-0">
      <div className="flex gap-3 pb-1">
        {programs.map((program) => {
          const programDate = program.start.slice(0, 10);
          const isToday = programDate === today;
          return (
            <div
              key={`${program.id}-${program.start}`}
              className={`flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border p-3 ${
                isToday
                  ? "border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/40"
                  : "border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950"
              }`}
            >
              <div className="flex items-center gap-2">
                <h3
                  className={`truncate text-xs font-semibold ${
                    isToday
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {formatEventDate(programDate, timezone)}
                </h3>
                {isToday ? (
                  <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Today
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
                <li className="flex flex-col py-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatTimeRange(program.start, program.end)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-black dark:text-zinc-50">
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
  programs,
  timezone,
}: {
  programs: Program[];
  timezone: string;
}) {
  const byDate = new Map<string, Program[]>();
  for (const p of programs) {
    const date = p.start.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(p);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byDate.entries()].map(([date, datePrograms]) => (
        <div key={date} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {formatEventDate(date, timezone)}
            </h3>
            <span className="flex-1 border-t border-dashed border-black/[.08] dark:border-white/[.1]" />
            <span className="text-xs text-zinc-400">
              {datePrograms.length}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
            {datePrograms.map((program) => (
              <li
                key={`${program.id}-${program.start}`}
                className="flex flex-col gap-1 py-2"
              >
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
