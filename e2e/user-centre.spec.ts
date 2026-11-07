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

  test("lists and manages favourite arenas", async ({ page }) => {
    const venues = loadVenues();
    const day = densestDay(venues);
    const from = `${day}T00:00`;
    const to = `${day}T23:59`;
    const venue = venues.find((v) => countInRange([v], from, to) > 0);
    if (!venue) throw new Error("no venue with programs on the densest day");
    const slug = slugify(venue.name);

    await freezeToDay(page, day);
    await page.goto(`/venue/${slug}`);
    await page.getByRole("button", { name: "Add to favourites" }).click();

    await page.goto("/");
    await page.getByRole("button", { name: "Open user centre" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The favourite is listed as a link to the arena.
    const link = dialog.getByRole("link", { name: venue.name });
    await expect(link).toBeVisible();

    // It can be removed directly from the user centre.
    await dialog
      .getByRole("button", { name: "Remove from favourites" })
      .click();
    await expect(link).toHaveCount(0);
    await expect(
      dialog.getByText("Add arenas to your favourites")
    ).toBeVisible();
  });

  test("settings toggle the colour theme", async ({ page }) => {
    await openDensestDay(page);

    await page.getByRole("button", { name: "Open user centre" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const html = page.locator("html");
    await dialog.getByRole("button", { name: "Dark mode" }).click();
    await expect(html).toHaveClass(/dark/);

    await dialog.getByRole("button", { name: "Light mode" }).click();
    await expect(html).not.toHaveClass(/dark/);
  });
});
