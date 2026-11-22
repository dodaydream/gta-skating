"use client";

import dynamic from "next/dynamic";
import { FilterBar } from "@/components/filters/FilterBar";
import { ScheduleSidebar } from "@/components/ScheduleSidebar";
import { VenueDetailModal } from "@/components/schedule/VenueDetailModal";
import {
  SkatingAppDataProvider,
  useSkatingAppData,
  type SkatingArea,
} from "@/components/SkatingAppDataProvider";

const VenueMap = dynamic(() => import("@/components/map/VenueMap"), {
  ssr: false,
});

function SkatingAppContent() {
  const {
    venues,
    visibleIndex,
    userLocation,
    focusVenue,
    fitBounds,
    favoriteFitPoints,
    locateRef,
    onSelect,
    onBoundsChange,
    detailSlug,
    closeDetail,
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
            fitBounds={fitBounds}
            fitTo={favoriteFitPoints}
          />

          <div className="absolute left-0 right-0 top-[calc(var(--safe-top)_+_0.75rem)] z-40 pl-[calc(var(--safe-left)_+_0.75rem)] pr-[calc(var(--safe-right)_+_0.75rem)] lg:top-[calc(var(--safe-top)_+_1.5rem)] lg:pl-[calc(var(--safe-left)_+_1.5rem)] lg:pr-[calc(var(--safe-right)_+_1.5rem)]">
            <FilterBar />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        <ScheduleSidebar />
      </div>

      {detailSlug ? (
        <VenueDetailModal
          key={detailSlug}
          slug={detailSlug}
          onClose={closeDetail}
        />
      ) : null}
    </div>
  );
}

export default function SkatingApp({
  initialSlug,
  area,
}: {
  initialSlug?: string;
  area?: SkatingArea;
}) {
  return (
    <SkatingAppDataProvider initialSlug={initialSlug} area={area}>
      <SkatingAppContent />
    </SkatingAppDataProvider>
  );
}
