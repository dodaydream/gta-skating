"use client";

import { cn } from "cn";
import { DateFilter } from "./Filter/DateFilter";
import { ProgramFilter } from "./Filter/ProgramFilter";
import { VenueDisplayOption } from "./VenueDisplayOption";
import { VenueSearch } from "./VenueSearch";

/**
 * Horizontal control bar for the map overlay. Controls wrap onto multiple rows
 * rather than scrolling, so every control stays visible at any width.
 */
export function AppBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-wrap items-center gap-1.5 lg:w-fit lg:gap-2 [&>*]:shrink-0",
        className
      )}
    >
      <VenueSearch />
      <DateFilter />
      <ProgramFilter />
      <VenueDisplayOption />
    </div>
  );
}
