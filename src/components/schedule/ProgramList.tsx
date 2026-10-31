"use client";

import { useMemo } from "react";
import type { Arena } from "@/types/arena";
import type { ProgramItem } from "@/types/schedule";
import { ProgramListItem } from "@/components/schedule/ProgramListItem";
import { ScheduleSkeleton } from "@/components/ui/ScheduleSkeleton";

type ProgramListProps = {
  loading: boolean;
  items: ProgramItem[];
  userLocation?: { lat: number; lon: number } | null;
  onSelectArena: (arena: Arena) => void;
  className?: string;
  listClassName?: string;
};

export function ProgramList({
  loading,
  items,
  userLocation,
  onSelectArena,
  className = "",
  listClassName = "flex flex-col gap-2 my-1",
}: ProgramListProps) {
  const arenaCount = useMemo(
    () => new Set(items.map((item) => item.arena.name)).size,
    [items]
  );

  return (
    <div className={className}>
      <div className={listClassName}>
        {loading ? (
          <ScheduleSkeleton />
        ) : (
          items.map((item) => (
            <ProgramListItem
              key={`${item.arena.name}-${item.start}-${item.name}`}
              program={item}
              onSelect={() => onSelectArena(item.arena)}
              userLocation={userLocation}
            />
          ))
        )}
      </div>

      <footer className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
        {arenaCount} arena{arenaCount === 1 ? "" : "s"}. Schedule data may change
        — check arena websites for the latest.
      </footer>
    </div>
  );
}
