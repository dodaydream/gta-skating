import { expect, test } from "./fixtures";
import {
  countInRange,
  densestDay,
  freezeToDay,
  loadVenues,
  programCount,
  slugify,
} from "./support";

test.describe("favourite venues", () => {
  test("favourites-only filter shows only the favourited venue", async ({
    page,
  }) => {
    const venues = loadVenues();
    const day = densestDay(venues);
    const from = `${day}T00:00`;
    const to = `${day}T23:59`;
    const venue = venues.find((v) => countInRange([v], from, to) > 0);
    if (!venue) throw new Error("no venue with programs on the densest day");

    await freezeToDay(page, day);
    await page.goto(`/en/venue/${slugify(venue.name)}`);

    const add = page.getByRole("button", { name: "Add to favourites" });
    await expect(add).toBeVisible();
    await add.click();

    const remove = page.getByRole("button", { name: "Remove from favourites" });
    await expect(remove).toHaveAttribute("aria-pressed", "true");

    await page.goto("/en");

    // With a saved favourite, the app defaults to the favourites view.
    const toggle = page.locator('[data-slot="venue-display"]');
    await expect(toggle).toHaveAttribute("aria-label", "Favourite venues only");

    await expect
      .poll(() => programCount(page))
      .toBe(countInRange([venue], from, to));
  });

  test("favourites-only with no favourites shows no programs", async ({
    page,
  }) => {
    const day = densestDay(loadVenues());
    await freezeToDay(page, day);
    await page.goto("/en");

    const toggle = page.locator('[data-slot="venue-display"]');
    await toggle.click();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Favourite venues only");

    await expect.poll(() => programCount(page)).toBe(0);
  });
});
