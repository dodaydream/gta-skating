import { expect, test } from "./fixtures";
import {
  addDays,
  countInRange,
  freezeToDay,
  lastProgramDay,
  loadVenues,
  openDensestDay,
  programCount,
  sidebar,
} from "./support";

test.describe("home schedule", () => {
  test("renders the heading and filter controls", async ({ page }) => {
    await openDensestDay(page);

    await expect(
      sidebar(page).getByRole("heading", { name: "Skating Programs" })
    ).toBeVisible();
    await expect(sidebar(page).getByText(/\d+ programs? found/)).toBeVisible();

    // Map overlay controls.
    await expect(
      page.getByRole("button", { name: "Centre on your location" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Today \d{1,2}:\d\d [AP]M - \d{1,2}:\d\d [AP]M$/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Filters", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Arenas with programs" })
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

  test("footer stays pinned below a long program list", async ({ page }) => {
    await openDensestDay(page);

    const aside = sidebar(page);
    const footer = aside.locator("footer");
    await expect(footer).toBeVisible();

    const scroller = aside.locator(":scope > div").first();
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollHeight > el.clientHeight + 4))
      .toBe(true);

    const before = await footer.boundingBox();
    if (!before) throw new Error("missing footer box");

    await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    const after = await footer.boundingBox();
    if (!after) throw new Error("missing footer box");

    // The footer is pinned, so scrolling the list must not move it.
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);

    const asideBox = await aside.boundingBox();
    if (!asideBox) throw new Error("missing aside box");
    expect(after.y + after.height).toBeLessThanOrEqual(
      asideBox.y + asideBox.height + 1
    );
  });

  test("shows the empty state when no program falls in the range", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, addDays(lastProgramDay(venues), 30));
    await page.goto("/");

    await expect.poll(() => programCount(page)).toBe(0);
    await expect(sidebar(page).getByText("No programs found")).toBeVisible();
    await expect(
      sidebar(page).getByText("Try a different date range or filters.")
    ).toBeVisible();
  });
});
