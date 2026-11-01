"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  detailOpen: boolean;
};

const DESKTOP_QUERY = "(min-width: 1024px)";
const SNAP_POINTS = [0.5, 0.95];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export function ScheduleSidebar({
  loading,
  items,
  userLocation,
  onSelectArena,
  detailOpen,
}: ScheduleSidebarProps) {
  const [open, setOpen] = useState(true);
  const [detent, setDetent] = useState<number>(SNAP_POINTS[0]);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!isDesktop) setOpen(!detailOpen);
  }, [detailOpen, isDesktop]);

  useEffect(() => {
    const root = document.documentElement;
    const fraction = open ? detent : 0;
    root.style.setProperty(
      "--drawer-height",
      `${Math.round(fraction * 100)}dvh`
    );
    return () => {
      root.style.removeProperty("--drawer-height");
    };
  }, [open, detent]);

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden flex-col overflow-y-auto border-t border-black/[.08] bg-card py-8 pl-[calc(var(--safe-left)_+_1.5rem)] pr-[calc(var(--safe-right)_+_1.5rem)] dark:border-white/[.145] lg:static lg:flex lg:w-96 lg:shrink-0 lg:border-t-0">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              GTA Skating Arenas
            </h1>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {items.length} program{items.length === 1 ? "" : "s"} found
            </span>
          </div>
          <Link
            href="/privacy"
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Privacy
          </Link>
        </div>

        <ProgramList
          items={items}
          loading={loading}
          userLocation={userLocation}
          onSelectArena={onSelectArena}
          listClassName="flex flex-col gap-2"
        />
      </aside>

      {/* Mobile bottom sheet */}
      <Drawer
        open={open}
        modal={false}
        disablePointerDismissal
        swipeDirection="down"
        snapToSequentialPoints
        snapPoints={SNAP_POINTS}
        onSnapPointChange={(next) => {
          if (typeof next === "number") setDetent(next);
        }}
        onOpenChange={(_nextOpen, eventDetails) => eventDetails.cancel()}
        showSwipeHandle
      >
        <DrawerContent
          className="border-black/[.08] dark:border-white/[.145] lg:hidden"
          header={
            <div className="flex items-center justify-between pb-4 pt-4 pl-[calc(var(--safe-left)_+_1.5rem)] pr-[calc(var(--safe-right)_+_1.5rem)]">
              <div className="flex flex-col">
                <DrawerTitle className="text-xl font-semibold tracking-tight">
                  GTA Skating Arenas
                </DrawerTitle>
                <DrawerDescription className="text-left text-sm">
                  {items.length} program{items.length === 1 ? "" : "s"} found
                </DrawerDescription>
              </div>
              <Link
                href="/privacy"
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Privacy
              </Link>
            </div>
          }
        >
          <ProgramList
            className="min-h-0 flex-1 overflow-y-auto pl-[calc(var(--safe-left)_+_1.5rem)] pr-[calc(var(--safe-right)_+_1.5rem)] pb-[calc(var(--safe-bottom)_+_2rem)]"
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
