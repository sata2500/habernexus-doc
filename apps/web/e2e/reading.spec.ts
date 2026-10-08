import { expect, test, type Page } from "@playwright/test";
import { trackPageErrors } from "./helpers";

const ARTICLE = "/article/e2e-uzun-haber";
const continueSection = (page: Page) => page.getByRole("region", { name: "Kaldığın yerden devam et" });

/** Haber metninin belirtilen oranına kaydırır ve takipçinin ölçmesini bekler */
async function scrollArticleTo(page: Page, fraction: number) {
  // Sanal saat kurulu olduğundan sayfanın yerleşmesi için zaman ilerletilir
  await page.clock.runFor(2000);
  const target = await page.evaluate((f) => {
    const body = document.getElementById("article-body")!;
    const top = body.getBoundingClientRect().top + window.scrollY;
    const y = Math.min(top + body.offsetHeight * f - window.innerHeight, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: y, behavior: "instant" });
    window.dispatchEvent(new Event("scroll"));
    return Math.round(y);
  }, fraction);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThanOrEqual(target - 2);
  await page.clock.runFor(1000);
}

test.describe("okuma takibi", () => {
  test.skip(({ isMobile }) => isMobile, "Masaüstünde sınanması yeterli");

  test("açıp çıkmak kayıt oluşturmaz; yarım bırakılan haber kalınan yerden açılır; bitirilince listeden düşer", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.clock.install();

    // 1) Açıp kaydırmadan çıkmak
    await page.goto(ARTICLE);
    await page.clock.runFor(15_000);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(continueSection(page)).toHaveCount(0);

    // 2) Yarısına kadar okuyup çıkmak
    await page.goto(ARTICLE);
    await scrollArticleTo(page, 0.5);
    await page.clock.runFor(12_000);
    await scrollArticleTo(page, 0.5);
    await page.goto("/");
    const card = continueSection(page).getByRole("link", { name: /E2E uzun haber/ });
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("href", /#devam-\d+$/);

    // 3) Kartla dönünce kalınan yere (birkaç satır geriden) gider
    const saved = Number((await card.getAttribute("href"))!.match(/#devam-(\d+)$/)![1]);
    expect(saved).toBeGreaterThan(20);
    await card.click();
    await expect(page.getByText("Kaldığın yerden devam ediyorsun")).toBeVisible();
    await page.clock.runFor(1000);
    const measured = await page.evaluate(() => {
      const body = document.getElementById("article-body")!.getBoundingClientRect();
      const end = document.getElementById("article-end")!.getBoundingClientRect();
      return ((window.innerHeight - body.top) / (end.top + 80 - body.top)) * 100;
    });
    expect(measured).toBeGreaterThan(saved - 10);
    expect(measured).toBeLessThanOrEqual(saved + 1);

    // 4) Sona kadar okuyunca (yeterli süre geçince) "Okundu"
    await scrollArticleTo(page, 1.2);
    // Hızlı kaydırmak yetmez: bu haber için en az okuma süresi 90 sn (lib/article-session.ts)
    await page.clock.runFor(20_000);
    await expect(page.getByText("Neredeyse bitti")).toBeVisible();
    await page.clock.runFor(80_000);
    await expect(page.getByText(/^Okundu/)).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(continueSection(page)).toHaveCount(0);

    // 5) Okunmuş habere yeniden girip çıkmak onu listeye geri düşürmez
    await page.goto(ARTICLE);
    await scrollArticleTo(page, 0.3);
    await page.clock.runFor(15_000);
    await scrollArticleTo(page, 0.35);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(continueSection(page)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
