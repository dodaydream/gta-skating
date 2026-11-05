import { sendGAEvent } from "@next/third-parties/google";

export type AnalyticsParams = Record<string, string | number | boolean>;

type WindowWithDataLayer = Window & { dataLayer?: unknown[] };

export function trackEvent(name: string, params?: AnalyticsParams) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GA_ID) return;
  // Seed the dataLayer so events queued before the GA init script runs are not
  // dropped (and sendGAEvent does not warn that the dataLayer is missing).
  const w = window as WindowWithDataLayer;
  w.dataLayer = w.dataLayer ?? [];
  sendGAEvent("event", name, params ?? {});
}
