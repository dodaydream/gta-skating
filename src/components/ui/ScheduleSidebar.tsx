"use client";

import { useEffect, useState } from "react";
import type { Arena } from "@/types/arena";
import type { ProgramItem } from "@/types/schedule";
import { ProgramList } from "@/components/schedule/ProgramList";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

type ScheduleSidebarProps = {
  loading: boolean;
  items: ProgramItem[];
  hideEmpty: boolean;
  onHideEmptyChange: (value: boolean) => void;
  userLocation?: { lat: number; lon: number } | null;
  onSelectArena: (arena: Arena) => void;
};

const SNAP_POINTS = [0.3, 0.6, 0.95];

export function ScheduleSidebar({
  loading,
  items,
  userLocation,
  onSelectArena,
}: ScheduleSidebarProps) {
  const [snapPoint, setSnapPoint] = useState<number>(SNAP_POINTS[0]);

  const heightPercent = Math.round((snapPoint ?? SNAP_POINTS[0]) * 100);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--drawer-height", `${heightPercent}dvh`);
    return () => {
      root.style.removeProperty("--drawer-height");
    };
  }, [heightPercent]);

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
        </div>

        <ProgramList
          items={items}
          loading={loading}
          userLocation={userLocation}
          onSelectArena={onSelectArena}
          listClassName="flex flex-col gap-2"
        />
      </aside>

      {/* Mobile always-visible bottom sheet */}
      <Drawer
        open
        modal={false}
        disablePointerDismissal
        swipeDirection="down"
        snapPoints={SNAP_POINTS}
        snapPoint={snapPoint}
        onSnapPointChange={(next) => {
          if (typeof next === "number") setSnapPoint(next);
        }}
        onOpenChange={(_open, eventDetails) => eventDetails.cancel()}
        showSwipeHandle
      >
        <DrawerContent
          className="border-black/[.08] bg-white text-black dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 lg:hidden"
          header={
            <div className="flex items-center justify-between px-6 pb-4 pt-1">
              <div className="flex flex-col">
                <DrawerTitle className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
                  GTA Skating Arenas
                </DrawerTitle>
                <DrawerDescription className="text-left text-sm text-zinc-500 dark:text-zinc-400">
                  {items.length} program{items.length === 1 ? "" : "s"} found
                </DrawerDescription>
              </div>
            </div>
          }
        >
          <ProgramList
            className="min-h-0 flex-1 overflow-y-auto px-6 pb-8"
            items={items}
            loading={loading}
            userLocation={userLocation}
            onSelectArena={onSelectArena}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}
