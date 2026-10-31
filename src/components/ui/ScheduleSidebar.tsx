"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Arena } from "@/types/arena";
import type { ProgramItem } from "@/types/schedule";
import { ProgramListItem } from "@/components/schedule/ProgramListItem";
import { ArenaDetailModal } from "@/components/schedule/ArenaDetailModal";
import { ScheduleSkeleton } from "@/components/ui/ScheduleSkeleton";
import { Switch } from "@/components/ui/switch";

type ScheduleSidebarProps = {
  loading: boolean;
  items: ProgramItem[];
  hideEmpty: boolean;
  onHideEmptyChange: (value: boolean) => void;
  userLocation?: { lat: number; lon: number } | null;
};

const SNAP_POINTS = [0.3, 0.6, 0.95];

export function ScheduleSidebar({
  loading,
  items,
  hideEmpty,
  onHideEmptyChange,
  userLocation,
}: ScheduleSidebarProps) {
  const [height, setHeight] = useState(0.3);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startPct = useRef(0.3);
  const [detailArena, setDetailArena] = useState<Arena | null>(null);

  const arenaCount = useMemo(
    () => new Set(items.map((item) => item.arena.name)).size,
    [items]
  );

  const onHandlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startPct.current = height;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [height]
  );

  const onHandlePointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const deltaPx = startY.current - e.clientY;
    const deltaPct = deltaPx / window.innerHeight;
    const next = Math.max(0.2, Math.min(0.98, startPct.current + deltaPct));
    setHeight(next);
  }, []);

  const onHandlePointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setHeight((h) => {
      const nearest = SNAP_POINTS.reduce((acc, s) =>
        Math.abs(s - h) < Math.abs(acc - h) ? s : acc
      );
      return nearest;
    });
  }, []);

  const heightPercent = Math.round(height * 100);

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden flex-col overflow-y-auto border-t border-black/[.08] bg-white px-6 py-8 dark:border-white/[.145] dark:bg-zinc-950 lg:static lg:flex lg:w-96 lg:shrink-0 lg:border-t-0">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              GTA Skating Arenas
            </h1>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {items.length} program{items.length === 1 ? "" : "s"} found
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            Programs only
            <Switch
              checked={hideEmpty}
              onCheckedChange={onHideEmptyChange}
              size="sm"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {loading ? (
            <ScheduleSkeleton />
          ) : (
            items.map((item) => (
              <ProgramListItem
                key={`${item.arena.name}-${item.date}-${item.start}-${item.name}`}
                program={item}
                onSelect={() => setDetailArena(item.arena)}
                userLocation={userLocation}
              />
            ))
          )}
        </div>

        <footer className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
          {arenaCount} arena{arenaCount === 1 ? "" : "s"}. Schedule data may
          change — check arena websites for the latest.
        </footer>
      </aside>

      {/* Mobile always-visible bottom sheet */}
      <section
        id="drawer-sheet"
        className="fixed inset-x-0 bottom-0 z-[1100] flex flex-col border-t border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950 lg:hidden"
        style={{ height: `${heightPercent}vh` }}
      >
        <button
          type="button"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          aria-label="Resize schedule list"
          className="flex shrink-0 justify-center pb-1 pt-2"
        >
          <span className="h-1.5 w-10 cursor-grab touch-none rounded-full bg-zinc-300 active:cursor-grabbing dark:bg-zinc-700 dark:hover:bg-zinc-500" />
        </button>

        <div className="mb-4 flex items-center justify-between px-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
              GTA Skating Arenas
            </h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {items.length} program{items.length === 1 ? "" : "s"} found
            </span>
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            Programs only
            <Switch
              checked={hideEmpty}
              onCheckedChange={onHideEmptyChange}
              size="sm"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 px-6 pb-8 overflow-y-auto">
          <div className="flex flex-col gap-2 my-1">
            {loading ? (
              <ScheduleSkeleton />
            ) : (
              items.map((item) => (
                <ProgramListItem
                  key={`${item.arena.name}-${item.date}-${item.start}-${item.name}`}
                  program={item}
                  onSelect={() => setDetailArena(item.arena)}
                  userLocation={userLocation}
                />
              ))
            )}
          </div>

          <footer className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
            {arenaCount} arena{arenaCount === 1 ? "" : "s"}. Schedule data may
            change — check arena websites for the latest.
          </footer>
        </div>
      </section>

      {detailArena ? (
        <ArenaDetailModal
          arena={detailArena}
          onClose={() => setDetailArena(null)}
        />
      ) : null}
    </>
  );
}