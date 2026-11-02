"use client";

import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * Horizontal control bar for the map overlay. On mobile the controls can
 * exceed the viewport width, so the bar scrolls horizontally instead of
 * wrapping; on desktop everything fits and scrolling is disabled.
 */
export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "no-scrollbar flex items-start gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain [&>*]:shrink-0",
        "lg:overflow-x-visible lg:overflow-y-visible",
        className
      )}
    >
      {children}
    </div>
  );
}
