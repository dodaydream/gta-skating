import { expect, test } from "./fixtures";
import {
  densestDay,
  freezeToDay,
  loadVenues,
  openDensestDay,
  sidebar,
  slugify,
  type VenueData,
} from "./support";

function venueWithMostPrograms(venues: VenueData[]): VenueData {
  return [...venues].sort(
    (a, b) => b.schedule.programs.length - a.schedule.programs.length
  )[0];
}

test.describe("venue detail", () => {
  test("deep link opens the venue panel", async ({ page }) => {
    const venues = loadVenues();
    await freezeToDay(page, densestDay(venues));
    const venue = venueWithMostPrograms(venues);

    await page.goto(`/venue/${slugify(venue.name)}`);

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-slot="dialog-title"]')).toHaveText(venue.name);
    await expect(dialog.locator('[data-slot="dialog-description"]')).toContainText(
      venue.address
    );

    // Day/Week toggle renders the timeline for the week view.
    await dialog.getByRole("tab", { name: "Week" }).click();
    await expect(dialog.getByRole("button", { name: "Next week" })).toBeVisible();

    if (venue.url) {
      await expect(dialog.getByRole("link", { name: "Venue website" })).toHaveAttribute(
        "href",
        venue.url
      );
    }
    await expect(dialog.getByRole("link", { name: "View on map" })).toBeVisible();

    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(dialog).toBeHidden();
  });

  test("selecting a program from the list opens its venue", async ({ page }) => {
    const { venues } = await openDensestDay(page);
    const names = new Set(venues.map((venue) => venue.name));

    const firstProgram = sidebar(page).locator("button").first();
    await expect(firstProgram).toBeVisible();
    await firstProgram.click();

    await expect(page).toHaveURL(/\/venue\/[^/]+$/);

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();

    const title = await dialog.locator('[data-slot="dialog-title"]').innerText();
    expect(names.has(title)).toBe(true);
    expect(page.url()).toMatch(new RegExp(`/venue/${slugify(title)}$`));
  });
});
