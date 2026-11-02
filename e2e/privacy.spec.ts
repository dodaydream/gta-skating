import { expect, test } from "./fixtures";
import { sidebar } from "./support";

test.describe("privacy policy", () => {
  test("renders the policy and links back to the schedule", async ({ page }) => {
    await page.goto("/privacy");

    await expect(page).toHaveTitle(/Privacy Policy/);
    await expect(
      page.getByRole("heading", { name: "Privacy Policy", level: 1 })
    ).toBeVisible();
    await expect(page.getByText(/Last updated:/)).toBeVisible();
    await expect(page.getByText("Advertising and third-party vendors")).toBeVisible();

    await page.getByRole("link", { name: "← Back to the schedule" }).first().click();

    await expect(page).toHaveURL(/\/$/);
    await expect(
      sidebar(page).getByRole("heading", { name: "Skating Programs in GTA" })
    ).toBeVisible();
  });
});
