import { defineConfig, devices } from "@playwright/test";

// The suite runs against a real `next dev` server so it exercises the app the
// same way a browser does (client-side data fetching, history routing, drawers).
const PORT = Number(process.env.E2E_PORT ?? 3000);
// Use `localhost` rather than 127.0.0.1: `next dev` blocks its dev-only
// resources (including the HMR client that gates hydration) for other origins.
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    timezoneId: "America/Toronto",
    locale: "en-US",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: `yarn next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Keep third-party analytics/ad scripts out of the test run.
      NEXT_PUBLIC_GA_ID: "",
      NEXT_PUBLIC_ADSENSE_CLIENT: "",
      NEXT_PUBLIC_ADSENSE_SLOT: "",
    },
  },
});
