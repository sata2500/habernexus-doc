import { expect, test } from "@playwright/test";
import { trackPageErrors } from "./helpers";

// Hiç seçim yapmamış yeni ziyaretçi
test.use({ storageState: { cookies: [], origins: [] } });

const band = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Çerez tercihiniz" });
const readsCookie = async (page: import("@playwright/test").Page) =>
  (await page.context().cookies()).find((c) => c.name === "hn_reads");

test.describe("çerez onayı", () => {
  test("reddedilince okuma geçmişi tutulmaz; tercih alt bilgiden değiştirilebilir", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto("/");
    await expect(band(page)).toBeVisible();

    await band(page).getByRole("button", { name: "Reddet" }).click();
    await expect(band(page)).toBeHidden();
    await page.goto("/article/e2e-deneme-haberi");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(band(page)).toBeHidden();
    expect(await readsCookie(page)).toBeUndefined();

    // Alt bilgiden yeniden açılır ve kabul edilir
    await page.getByRole("button", { name: "Çerez tercihleri" }).click();
    await expect(band(page)).toContainText("ret");
    await band(page).getByRole("button", { name: "Kabul et" }).click();
    await expect(band(page)).toBeHidden();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(async () => (await readsCookie(page))?.value ?? "").not.toBe("");
    expect(errors).toEqual([]);
  });
});
