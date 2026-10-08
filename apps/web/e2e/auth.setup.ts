import { expect, test as setup } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "./accounts";
import { CONSENT_COOKIE, serializeConsent } from "../lib/consent";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
/** Çerez bandı seçimi yapılmış sayılır; bant içeriğin üstüne binip tıklamaları engellemesin */
const consentCookie = { name: CONSENT_COOKIE, value: serializeConsent({ personalization: true, analytics: false, ads: false }), url: baseURL };

setup("misafir (çerez tercihi seçilmiş)", async ({ context }) => {
  await context.addCookies([consentCookie]);
  await context.storageState({ path: "e2e/.auth/guest.json" });
});

/**
 * Her rol için bir kez giriş yapılır ve oturum dosyaya yazılır; testler bu oturumu kullanır.
 * (Giriş hız sınırı dakikada 5 deneme: her testte yeniden giriş yapmak sınıra takılırdı.)
 */
for (const [role, email] of Object.entries(E2E_USERS)) {
  setup(`${role} oturumu`, async ({ page }) => {
    await page.context().addCookies([consentCookie]);
    await page.goto("/login?callbackUrl=%2Fdashboard%2Fprofile");
    await page.getByLabel("E-posta adresi").fill(email);
    await page.locator("#login-password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page).toHaveURL(/^[^?]*\/dashboard\/profile/);
    await page.context().storageState({ path: `e2e/.auth/${role}.json` });
  });
}
