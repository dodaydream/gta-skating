"use client";

import { useEffect, useRef } from "react";

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

export const adsEnabled = Boolean(AD_CLIENT);

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdFormat = "auto" | "horizontal" | "rectangle" | "vertical";

type AdUnitProps = {
  className?: string;
  slot?: string;
  /** AdSense size hint; "auto" is full-width responsive. */
  format?: AdFormat;
};

export function AdUnit({
  className = "",
  slot = AD_SLOT,
  format = "auto",
}: AdUnitProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_CLIENT || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // The AdSense script processes queued pushes once it loads.
    }
  }, [slot]);

  if (!AD_CLIENT || !slot) return null;

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: "block" }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      {...(format === "auto"
        ? { "data-full-width-responsive": "true" }
        : {})}
    />
  );
}
