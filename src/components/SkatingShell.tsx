"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { ScheduleSidebar } from "@/components/ScheduleSidebar";
import {
  SkatingAppDataProvider,
  useSkatingAppData,
} from "@/components/SkatingAppDataProvider";

const VenueMap = dynamic(() => import("@/components/map/VenueMap"), {
  ssr: false,
});

function SkatingShellInner({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  const {
    venues,
    visibleIndex,
    userLocation,
    focusVenue,
    favoriteFitPoints,
    locateRef,
    onSelect,
    onBoundsChange,
  } = useSkatingAppData();

  return (
    <div className="flex h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative flex-1 shrink-0 overflow-hidden lg:h-auto lg:flex-1">
          <VenueMap
            venues={venues}
            selectedIndex={visibleIndex}
            onSelect={onSelect}
            onBoundsChange={onBoundsChange}
            userLocation={userLocation}
            locateRef={locateRef}
            focusVenue={focusVenue}
            fitTo={favoriteFitPoints}
          />

          <div className="absolute left-0 right-0 top-[calc(var(--safe-top)_+_0.75rem)] z-40 pl-[calc(var(--safe-left)_+_0.75rem)] pr-[calc(var(--safe-right)_+_0.75rem)] lg:top-[calc(var(--safe-top)_+_1.5rem)] lg:pl-[calc(var(--safe-left)_+_1.5rem)] lg:pr-[calc(var(--safe-right)_+_1.5rem)]">
            <FilterBar />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        <ScheduleSidebar />
      </div>

      {children}
      {modal}
    </div>
  );
}

/**
 * The persistent skating app shell: shared data provider, map, sidebar, and
 * filter bar. Rendered from `[lang]/layout.tsx` so it stays mounted across
 * navigation, with the route content (`children` = home, `modal` = venue detail)
 * rendered inside it so both can read the shared context.
 */
export function SkatingShell({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <SkatingAppDataProvider>
      <SkatingShellInner modal={modal}>{children}</SkatingShellInner>
    </SkatingAppDataProvider>
  );
}
