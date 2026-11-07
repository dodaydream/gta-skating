import { expect, test } from "./fixtures";
import {
  countInRange,
  densestDay,
  freezeToDay,
  loadVenues,
  openDensestDay,
  slugify,
} from "./support";

test.describe("user centre", () => {
  test("avatar opens the user centre and any click dismisses it", async ({
    page,
  }) => {
    await openDensestDay(page);

    const avatar = page.getByRole("button", { name: "Open user centre" });
    await expect(avatar).toBeVisible();
    await avatar.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("User centre")).toBeVisible();
    await expect(
      dialog.getByText("Add arenas to your favourites")
    ).toBeVisible();

    // The backdrop covers the page; clicking anywhere dismisses the user centre.
    await page.mouse.click(5, 5);
    await expect(dialog).toHaveCount(0);
  });

  test("shows a week view of the favourite arenas", async ({ page }) => {
    const venues = loadVenues();
    const day = densestDay(venues);
    const from = `${day}T00:00`;
    const to = `${day}T23:59`;
    const venue = venues.find((v) => countInRange([v], from, to) > 0);
    if (!venue) throw new Error("no venue with programs on the densest day");

    await freezeToDay(page, day);
    await page.goto(`/venue/${slugify(venue.name)}`);
    await page.getByRole("button", { name: "Add to favourites" }).click();

    await page.goto("/");
    await page.getByRole("button", { name: "Open user centre" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Previous week" })
    ).toBeVisible();

    // Clicking a program's arena link opens that arena.
    const slug = slugify(venue.name);
    const link = dialog.locator(`a[href="/venue/${slug}"]`).first();
    await expect(link).toBeVisible();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/venue/${slug}$`));
  });
});
