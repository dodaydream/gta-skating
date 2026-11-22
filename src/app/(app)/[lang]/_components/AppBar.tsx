"use client";

import { cn } from "cn";
import { DateFilter } from "./Filter/DateFilter";
import { ProgramFilter } from "./Filter/ProgramFilter";
import { LocateButton } from "./LocateButton";
import { VenueDisplayOption } from "./VenueDisplayOption";

/**
 * Horizontal control bar for the map overlay. On mobile the controls can
 * exceed the viewport width, so the bar scrolls horizontally instead of
 * wrapping; on desktop everything fits and scrolling is disabled.
 */
export function AppBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "no-scrollbar flex items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain lg:gap-2 [&>*]:shrink-0",
        "lg:overflow-x-visible lg:overflow-y-visible",
        className
      )}
    >
      <LocateButton />
      <DateFilter />
      <ProgramFilter />
      <VenueDisplayOption />
    </div>
  );
}
