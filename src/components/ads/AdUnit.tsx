"use client";

import { useEffect, useRef } from "react";

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdUnitProps = {
  className?: string;
};

export function AdUnit({ className = "" }: AdUnitProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!AD_CLIENT || !AD_SLOT || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // The AdSense script processes queued pushes once it loads.
    }
  }, []);

  if (!AD_CLIENT || !AD_SLOT) return null;

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: "block" }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={AD_SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
