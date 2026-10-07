import { expect, test } from "@playwright/test";
import { E2E_USERS } from "./accounts";
import { session, trackPageErrors } from "./helpers";

test.describe("giriş", () => {
  test("yanlış şifre Türkçe hata verir", async ({ page, isMobile }) => {
    // Giriş hız sınırı (dakikada 5) tüketilmesin diye tek projede çalışır
    test.skip(isMobile, "Masaüstünde sınanır");
    await page.goto("/login");
    await page.getByLabel("E-posta adresi").fill(E2E_USERS.reader);
    await page.locator("#login-password").fill("yanlis-sifre-123");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByText("E-posta adresi ya da şifre hatalı.")).toBeVisible();
  });
});

test.describe("okur", () => {
  test.use({ storageState: session("reader") });

  test("giriş, haber kaydetme ve kaydedilenlerden çıkarma", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto("/article/e2e-deneme-haberi");

    const save = page.getByRole("button", { name: /Daha sonra okumak için kaydet|Kaydedilenlerden çıkar/ });
    // Önceki bir koşudan kayıtlı kalmışsa önce çıkarılır
    if ((await save.getAttribute("aria-pressed")) === "true") await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");

    await page.goto("/dashboard/bookmarks");
    await expect(page.getByText("E2E deneme haberi").first()).toBeVisible();
    await page.getByRole("button", { name: /kaydedilenlerden çıkar/ }).first().click();
    await expect(page.getByText("Okuma listeniz boş")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("panel sayfaları açılır; okur yazar masasına giremez", async ({ page }) => {
    for (const [path, heading] of [["/dashboard/profile", "Profil bilgileri"], ["/dashboard/history", "Okuduklarım"], ["/dashboard/settings", "Tercihler"]] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    }
    await page.goto("/author");
    await expect(page).toHaveURL(/\/dashboard\/profile/);
  });
});

test.describe("yazar", () => {
  test.use({ storageState: session("author") });
  test("taslak (etiketli) Ctrl+S ile kaydedilir, yayınlanınca sitede görünür", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto("/author/articles/new");
    const title = `E2E yazar haberi ${Date.now()}`;
    await page.locator("#article-title").fill(title);
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("Bu haber uçtan uca testte yazıldı. Yayınlanabilmesi için yeterince uzun bir metin içeriyor.");
    await page.locator("#article-category").selectOption({ label: "E2E Gündem" });
    await page.locator("#article-tags").fill("E2E Etiketi");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ControlOrMeta+s");
    await expect(page).toHaveURL(/\/edit\?kaydedildi=taslak/);
    await expect(page.getByRole("list", { name: "Eklenen etiketler" })).toContainText("E2E Etiketi");

    await page.getByRole("button", { name: "Yayınla" }).click();
    await expect(page.getByText("Haber yayınlandı.")).toBeVisible();
    const link = page.getByRole("link", { name: /Sitede gör/ });
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/article\//);
    await page.goto(href!);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    expect(errors).toEqual([]);
  });
});

test.describe("yönetici", () => {
  test.use({ storageState: session("admin") });
  test("yönetim sayfaları açılır", async ({ page }) => {
    const errors = trackPageErrors(page);
    for (const path of ["/admin", "/admin/articles", "/admin/users", "/admin/categories", "/admin/karar-merkezi", "/admin/settings", "/admin/settings?tab=sistem"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("site ayarlarında geçersiz adres alan adıyla bildirilir", async ({ page }) => {
    await page.goto("/admin/settings");
    const field = page.getByLabel("Instagram");
    await field.fill("gecersiz-adres");
    await page.getByRole("button", { name: /Değişiklikleri kaydet/ }).click();
    await expect(page.getByText("Instagram adresi geçersiz.", { exact: false })).toBeVisible();
  });
});
