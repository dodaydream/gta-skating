import { expect, test } from "./fixtures";
import {
  addDays,
  countInRange,
  densestDay,
  freezeToDay,
  loadVenues,
  openDensestDay,
  programCount,
  sidebar,
} from "./support";

test.describe("home schedule", () => {
  test("renders the heading and filter controls", async ({ page }) => {
    await openDensestDay(page);

    await expect(
      sidebar(page).getByRole("heading", { name: "Skating Programs in GTA" })
    ).toBeVisible();
    await expect(sidebar(page).getByText(/\d+ programs? found/)).toBeVisible();

    // Map overlay controls.
    await expect(
      page.getByRole("button", { name: "Centre on your location" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Today \d\d:\d\d - \d\d:\d\d$/ })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Type", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show all venues" })
    ).toBeVisible();

    // Footer navigation.
    await expect(sidebar(page).getByRole("link", { name: "Privacy Policy" })).toBeVisible();
  });

  test("lists every program scheduled for the selected day", async ({ page }) => {
    const { venues, day } = await openDensestDay(page);

    const expected = countInRange(venues, `${day}T00:00`, `${day}T23:59`);
    expect(expected).toBeGreaterThan(0);

    await expect.poll(() => programCount(page)).toBe(expected);
    await expect(sidebar(page).locator('[data-slot="program-item"]')).toHaveCount(
      expected
    );
  });

  test("shows the empty state when no program falls in the range", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, addDays(densestDay(venues), 60));
    await page.goto("/");

    await expect.poll(() => programCount(page)).toBe(0);
    await expect(sidebar(page).getByText("No programs found")).toBeVisible();
    await expect(
      sidebar(page).getByText("Try a different date range or filters.")
    ).toBeVisible();
  });
});
