"use client";

import { useEffect, useState } from "react";

export const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Tracks whether the viewport matches the app's desktop breakpoint. Returns
 * `true` during SSR so the initial markup matches the default desktop layout.
 */
export function useIsDesktop(): boolean {
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
