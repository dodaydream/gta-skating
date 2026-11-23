import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  addDays,
  densestDay,
  freezeToDay,
  lastProgramDay,
  loadVenues,
  openDensestDay,
  slugify,
  type VenueData,
} from "./support";

// WCAG 2.2 A/AA rules only; best-practice rules are intentionally excluded so
// the suite tracks conformance rather than style preferences.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// The scans can wait on a cold Next.js dev compile of a route, so give each
// test headroom beyond the 30s default.
test.describe.configure({ timeout: 60_000 });

async function expectNoSeriousViolations(
  page: Page,
  excludes: string[] = []
): Promise<void> {
  // Wait for transitions to settle: the document title is briefly empty while a
  // modal route resolves, and Base UI popups carry entering/exiting data
  // attributes mid-animation. Scanning then avoids transient false positives.
  await page.waitForFunction(() => document.title.trim().length > 0);
  await page.waitForFunction(
    () => document.querySelector("[data-starting-style], [data-ending-style]") === null
  );
  // Base UI's focus guards are intentionally focusable and aria-hidden; they
  // are not a real focus-safety problem, so they are excluded from the scan.
  let builder = new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude("[data-base-ui-focus-guard]");
  for (const selector of excludes) builder = builder.exclude(selector);
  const results = await builder.analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );
  const summary = serious
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`)
    .join("\n");
  const details = serious
    .flatMap((v) =>
      v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${n.failureSummary}`)
    )
    .join("\n");
  expect(summary, details).toBe("");
}

function venueWithMostPrograms(venues: VenueData[]): VenueData {
  return [...venues].sort(
    (a, b) => b.schedule.programs.length - a.schedule.programs.length
  )[0];
}

test.describe("accessibility", () => {
  test("home schedule has no serious violations", async ({ page }) => {
    await openDensestDay(page);
    await expectNoSeriousViolations(page);
  });

  test("empty schedule state has no serious violations", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, addDays(lastProgramDay(venues), 30));
    await page.goto("/en");
    await expect(page.getByText("No programs found").first()).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("search dialog has no serious violations", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, densestDay(venues));
    await page.goto("/en");

    await page.getByRole("button", { name: "Search venues" }).click();
    await expect(
      page.getByRole("textbox", { name: "Search venues" })
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("filters dialog has no serious violations", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, densestDay(venues));
    await page.goto("/en");

    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(page.getByText("Sort by").first()).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("user centre has no serious violations", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, densestDay(venues));
    await page.goto("/en");

    await page.getByRole("button", { name: "Open user centre" }).click();
    await expect(page.getByText("Settings").first()).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("venue detail has no serious violations", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, densestDay(venues));
    const venue = venueWithMostPrograms(venues);
    await page.goto(`/en/venue/${slugify(venue.name)}`);

    await expect(
      page.getByRole("heading", { name: venue.name, exact: true })
    ).toBeVisible({ timeout: 15_000 });
    await expectNoSeriousViolations(page);
  });

  test("404 page has no serious violations", async ({ page }) => {
    await page.goto("/en/this-page-does-not-exist");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // The large "404" is a decorative, aria-hidden watermark (WCAG 1.4.3
    // incidental-text exception), so it is excluded from the contrast scan.
    await expectNoSeriousViolations(page, [".text-6xl"]);
  });

  for (const path of ["/faq", "/privacy", "/data-sources"]) {
    test(`content page ${path} has no serious violations`, async ({ page }) => {
      await page.goto(path);
      await expectNoSeriousViolations(page);
    });
  }
});

test.describe("accessibility (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("home drawer has no serious violations", async ({ page }) => {
    await openDensestDay(page);
    await expectNoSeriousViolations(page);
  });

  test("filters drawer has no serious violations", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, densestDay(venues));
    await page.goto("/en");

    // Wait for the mobile drawer to mount (post-hydration) before clicking, so
    // the click isn't lost during the desktop-dialog to drawer swap.
    await page
      .locator('[data-slot="drawer-popup"]')
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(page.getByText("Sort by").last()).toBeVisible({
      timeout: 15_000,
    });
    await expectNoSeriousViolations(page);
  });

  test("venue detail drawer has no serious violations", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, densestDay(venues));
    const venue = venueWithMostPrograms(venues);
    await page.goto(`/en/venue/${slugify(venue.name)}`);

    await expect(
      page.getByRole("heading", { name: venue.name, exact: true })
    ).toBeVisible({ timeout: 15_000 });
    await expectNoSeriousViolations(page);
  });
});
