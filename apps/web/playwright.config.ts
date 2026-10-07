import { defineConfig, devices } from "@playwright/test";

/**
 * Uçtan uca duman testleri. Üretim derlemesine karşı çalışır:
 *   npm run build && npm run test:e2e
 * E2E_BASE_URL verilirse o adrese bağlanır ve sunucu başlatmaz (ör. çalışan yerel sunucu).
 */
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  use: {
    baseURL,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Her rol için bir kez giriş (oturum dosyaları e2e/.auth altında)
    { name: "kurulum", testMatch: /auth\.setup\.ts/ },
    { name: "mobil", use: { ...devices["Pixel 7"] }, dependencies: ["kurulum"] },
    { name: "masaustu", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } }, dependencies: ["kurulum"] },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start -- -p 3000", url: `${baseURL}/rss.xml`, reuseExistingServer: true, timeout: 120_000 },
});
