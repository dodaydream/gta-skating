import { sendGAEvent } from "@next/third-parties/google";

export type AnalyticsParams = Record<string, string | number | boolean>;

export function trackEvent(name: string, params?: AnalyticsParams) {
  if (typeof window === "undefined") return;
  sendGAEvent("event", name, params ?? {});
}
