"use client";

import type { Arena } from "@/types/arena";
import type { ProgramItem } from "@/types/schedule";
import { ProgramListItem } from "@/components/schedule/ProgramListItem";
import { AdUnit } from "@/components/ads/AdUnit";
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

      <AdUnit className="mt-3" />
    </div>
  );
}
