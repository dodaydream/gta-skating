"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { syncThemeFromStorage } from "@/lib/theme";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Re-asserts the persisted theme on `<html>` after client-side navigations.
 *
 * Navigating between root parameters (e.g. `/en` -> `/fr`) re-renders the root
 * layout, and React resets `<html>`'s `className` to the server-rendered value,
 * dropping the `dark` class that `ThemeScript` applied imperatively. Running
 * before paint keeps the theme (and the map's dark tiles) unchanged.
 */
export function ThemeSync() {
  const pathname = usePathname();
  useIsomorphicLayoutEffect(() => {
    syncThemeFromStorage();
  }, [pathname]);
  return null;
}
