import { expect, test } from "./fixtures";
import {
  addDays,
  countInRange,
  mostCommonType,
  openDensestDay,
  programCount,
} from "./support";

test.describe("schedule filters", () => {
  test("date range filter applies a custom range", async ({ page }) => {
    const { venues, day } = await openDensestDay(page);

    const allPrograms = countInRange(venues, `${day}T00:00`, `${day}T23:59`);
    await expect.poll(() => programCount(page)).toBe(allPrograms);

    const rangeStart = addDays(day, 2);
    const rangeEnd = addDays(day, 3);

    await page
      .getByRole("button", {       name: /^Today \d{1,2}:\d\d [AP]M - \d{1,2}:\d\d [AP]M$/ })
      .click();

    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();

    await popover.locator(`[data-day="${rangeStart}"] button`).click();
    await popover.locator(`[data-day="${rangeEnd}"] button`).click();
    await popover.getByRole("button", { name: "OK", exact: true }).click();

    await expect(popover).toBeHidden();
    // The trigger no longer reads "Today ...".
    await expect(
      page.getByRole("button", {       name: /^Today \d{1,2}:\d\d [AP]M - \d{1,2}:\d\d [AP]M$/ })
    ).toHaveCount(0);

    const expected = countInRange(venues, `${rangeStart}T00:00`, `${rangeEnd}T23:59`);
    await expect.poll(() => programCount(page)).toBe(expected);
  });

  test("editing only the time updates the applied range", async ({ page }) => {
    await openDensestDay(page);

    const trigger = page.locator('[data-slot="popover-trigger"]').first();
    await expect(trigger).toHaveText(/^Today \d{1,2}:\d\d [AP]M - \d{1,2}:\d\d [AP]M$/);

    await trigger.click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();

    await popover.locator('input[type="time"]').first().fill("08:00");
    await popover.getByRole("button", { name: "OK", exact: true }).click();
    await expect(popover).toBeHidden();

    await expect(trigger).toHaveText(/^Today 8:00 AM - \d{1,2}:\d\d [AP]M$/);
  });

  test("program type filter narrows the results", async ({ page }) => {
    const { venues, day } = await openDensestDay(page);

    const allPrograms = countInRange(venues, `${day}T00:00`, `${day}T23:59`);
    await expect.poll(() => programCount(page)).toBe(allPrograms);

    const type = mostCommonType(venues);

    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const option = page.getByRole("button", { name: type, exact: true });
    await expect(option).toHaveAttribute("aria-pressed", "false");
    await option.click();

    await expect(option).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Program type" })
    ).toBeVisible();

    const expected = countInRange(venues, `${day}T00:00`, `${day}T23:59`, type);
    await expect.poll(() => programCount(page)).toBe(expected);
    expect(expected).toBeLessThanOrEqual(allPrograms);
  });

  test("venue display toggle cycles through the three modes", async ({
    page,
  }) => {
    await openDensestDay(page);

    const toggle = page.locator('[data-slot="venue-display"]');
    await expect(toggle).toHaveAttribute("aria-label", "Venues with programs");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "All venues");

    await toggle.click();
    await expect(toggle).toHaveAttribute(
      "aria-label",
      "Favourite venues only"
    );

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Venues with programs");
  });
});
