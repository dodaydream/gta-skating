import { expect, test } from "./fixtures";
import { openDensestDay, sidebar } from "./support";

test.describe("language", () => {
  test("defaults to English and switches to French with the toggle", async ({
    page,
  }) => {
    await openDensestDay(page);

    await expect(
      sidebar(page).getByRole("heading", {
        name: "Skating Programs in GTA",
      })
    ).toBeVisible();

    await page.getByRole("button", { name: "fr", exact: true }).click();

    await expect(
      sidebar(page).getByRole("heading", {
        name: "Programmes de patinage dans le GTA",
      })
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test.describe("French browser (fr-CA)", () => {
    test.use({ locale: "fr-CA" });

    test("detects the locale from the browser", async ({ page }) => {
      await openDensestDay(page);

      await expect(
        sidebar(page).getByRole("heading", {
          name: "Programmes de patinage dans le GTA",
        })
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    });
  });
});
