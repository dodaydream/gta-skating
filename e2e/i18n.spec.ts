import { expect, test } from "./fixtures";
import { openDensestDay, sidebar } from "./support";

test.describe("language", () => {
  test("defaults to English and switches to French with the toggle", async ({
    page,
  }) => {
    await openDensestDay(page);

    await expect(
      sidebar(page).getByRole("heading", {
        name: "Skating Programs",
      })
    ).toBeVisible();

    await page.getByRole("button", { name: "Open user centre" }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "fr", exact: true })
      .click();

    await expect(dialog.getByText("Centre utilisateur")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test.describe("French browser (fr-CA)", () => {
    test.use({ locale: "fr-CA" });

    test("detects the locale from the browser", async ({ page }) => {
      await openDensestDay(page);

      await expect(
        sidebar(page).getByRole("heading", {
          name: "Programmes de patinage",
        })
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    });
  });
});
