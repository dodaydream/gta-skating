import type { ProgramItem } from "@/types/schedule";
import {
  distanceKm,
  formatHumanDate,
  formatTimeRange,
  getTodayInArenaTime,
} from "@/data/schedules";

export function ProgramListItem({
  program,
  onSelect,
  userLocation,
}: {
  program: ProgramItem;
  onSelect: () => void;
  userLocation?: { lat: number; lon: number } | null;
}) {
  const arena = program.arena;
  const isToday = program.date === getTodayInArenaTime(arena.timezone);
  const hasCoords =
    userLocation &&
    arena.coordinates &&
    isFinite(arena.coordinates.lat) &&
    isFinite(arena.coordinates.lon);
  const distance = hasCoords
    ? distanceKm(
        userLocation.lat,
        userLocation.lon,
        arena.coordinates.lat,
        arena.coordinates.lon
      )
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-1 rounded-xl border border-black/[.08] bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-white/[.145] dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        <span className="font-mono">
  {isToday
    ? `Today·${formatTimeRange(program.start, program.end)}`
    : `${formatHumanDate(program.date, program.arena.timezone)}·${formatTimeRange(program.start, program.end)}`}
</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-black dark:text-zinc-50">
          {program.name}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="min-w-0 truncate">
          {arena.name}&nbsp;·
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