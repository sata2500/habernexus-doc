import { type Page } from "@playwright/test";

/** Sayfadaki yakalanmamış istemci hatalarını toplar (test sonunda boş olmalı) */
export function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** auth.setup.ts'in kaydettiği oturum dosyası */
export const session = (role: "guest" | "reader" | "author" | "admin") => `e2e/.auth/${role}.json`;
