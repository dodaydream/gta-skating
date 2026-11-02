import { expect, test as base } from "@playwright/test";

/**
 * Test fixture that makes the page hermetic and deterministic:
 *
 * - WebGL is disabled, so the MapLibre map is skipped and the schedule is not
 *   filtered by the map viewport. `src/components/map/VenueMap.tsx` already
 *   treats a failed map as non-fatal, so the rest of the app keeps working and
 *   assertions can compare against the full data set.
 * - Requests to third-party origins (map style/tiles, Google Analytics,
 *   AdSense) are aborted so the suite never depends on the network.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        ...args: Parameters<typeof getContext>
      ) {
        if (typeof args[0] === "string" && args[0].startsWith("webgl")) {
          return null;
        }
        return getContext.apply(this, args);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return route.continue();
      }
      if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
        return route.continue();
      }
      return route.abort();
    });

    await provide(page);
  },
});

export { expect };
