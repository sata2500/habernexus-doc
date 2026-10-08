import { expect, test } from "@playwright/test";
import { trackPageErrors } from "./helpers";
import { E2E_SPONSOR_ID } from "./accounts";

test.describe("herkese açık site", () => {
  test("ana sayfa açılır, tek h1 vardır ve yatay taşma olmaz", async ({ page }) => {
    const errors = trackPageErrors(page);
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });

  test("haber sayfası: başlık, yayın saati ve okur tepkileri", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto("/article/e2e-deneme-haberi");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E deneme haberi");
    await expect(page.locator("time").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bu habere tepkiniz?" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("olmayan haber gerçek 404 döner", async ({ page }) => {
    const res = await page.goto("/article/boyle-bir-haber-yok-e2e");
    expect(res?.status()).toBe(404);
  });

  test("arama sonuç bulur ve sayfadaki kutuyla yeniden aranabilir", async ({ page }) => {
    await page.goto("/search?q=e2e");
    await expect(page.getByText(/haber bulundu/)).toBeVisible();
    const form = page.getByRole("main").getByRole("search");
    await form.getByLabel("Haberlerde ara").fill("xy");
    await form.getByRole("button", { name: "Ara", exact: true }).click();
    await expect(page).toHaveURL(/q=xy/);
  });

  test("içeriğe geç bağlantısı klavyeyle ilk odaklanan öğedir", async ({ page, isMobile }) => {
    test.skip(isMobile, "Klavye gezintisi masaüstünde sınanır");
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();
  });

  test("güvenlik başlıkları ve RSS akışı", async ({ request }) => {
    const home = await request.get("/");
    expect(home.headers()["content-security-policy"]).toContain("object-src 'none'");
    expect(home.headers()["x-content-type-options"]).toBe("nosniff");

    const rss = await request.get("/rss.xml");
    expect(rss.status()).toBe(200);
    expect(await rss.text()).toContain("<rss");
    expect((await request.get("/rss/%3Cx%3E")).status()).toBe(404);
  });

  test("yönetim paneli girişsiz açılmaz", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin/);
  });

  test("sponsor reklamı etiketli görünür, tıklama sayılıp reklam verene yönlendirilir", async ({ page, request }) => {
    const errors = trackPageErrors(page);
    await page.goto("/article/e2e-deneme-haberi");
    const slot = page.locator('[data-ad-placement="article_content"]');
    await expect(slot).toContainText("Sponsorlu · E2E Reklamveren");
    const link = slot.getByRole("link", { name: "E2E sponsor reklamı" });
    await expect(link).toHaveAttribute("rel", /sponsored/);
    const href = await link.getAttribute("href");
    expect(href).toBe(`/api/ads/${E2E_SPONSOR_ID}/click`);
    const res = await request.get(href!, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("https://example.com/e2e-sponsor");
    // Kapalı alanlar hiç çizilmez
    await expect(page.locator('[data-ad-placement="article_bottom"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("ads.txt düz metin olarak sunulur", async ({ request }) => {
    const res = await request.get("/ads.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
  });
});
