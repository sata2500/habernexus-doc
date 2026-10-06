import "server-only";

import { revalidatePath } from "next/cache";
import { appCache } from "@/lib/cache";

/**
 * Bir haber yayımlandığında, düzenlendiğinde, yayından kaldırıldığında ya da silindiğinde
 * herkese açık sayfaların eski kopyalarını temizler: uygulama önbelleği (Redis/bellek) ve
 * Next.js sayfa önbelleği (ISR). Aksi halde kaldırılan haber bir saate kadar görünmeye devam ediyordu.
 */
export async function invalidateArticle(slug?: string | null) {
  return invalidateArticles(slug ? [slug] : []);
}

export async function invalidateArticles(slugs: string[]) {
  await Promise.all([
    ...slugs.map((s) => appCache.invalidate(`data:article:${s}`)),
    appCache.invalidate("data:hero-article"),
    appCache.invalidatePattern("data:trending:*"),
    appCache.invalidate("data:categories-count"),
    appCache.invalidatePattern("data:category:*"),
  ]).catch((e) => console.warn("[Cache] Haber önbelleği temizlenemedi:", e));
  try {
    for (const s of slugs) revalidatePath(`/article/${s}`);
    revalidatePath("/");
  } catch {
    // İstek bağlamı dışında (betik vb.) çağrıldıysa sayfa önbelleği kendi süresinde yenilenir
  }
}
