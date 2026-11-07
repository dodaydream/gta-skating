import { expect, test } from "./fixtures";
import { openDensestDay, sidebar } from "./support";

test.describe("language", () => {
  test("English renders at /en and French at /fr", async ({ page }) => {
    await openDensestDay(page);

    await expect(
      sidebar(page).getByRole("heading", { name: "Skating Programs" })
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.goto("/fr");

    await expect(
      sidebar(page).getByRole("heading", { name: "Programmes de patinage" })
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("the toggle switches the locale and the URL", async ({ page }) => {
    await openDensestDay(page);

    await page.getByRole("button", { name: "Open user centre" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "fr", exact: true }).click();

    await expect(page).toHaveURL(/\/fr$/);
    await expect(
      sidebar(page).getByRole("heading", { name: "Programmes de patinage" })
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test.describe("French browser (fr-CA)", () => {
    test.use({ locale: "fr-CA" });

    test("the root redirects to the browser-preferred locale", async ({
      page,
    }) => {
      await page.goto("/");

      await expect(page).toHaveURL(/\/fr$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    });
  });
});
