"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getSafeActionError } from "@/lib/server/authz";
import { applyPendingMigrations, getMigrationStatus } from "@/lib/server/db-migrations";

export async function getMigrationStatusAction() {
  await requireRole("ADMIN");
  try {
    return { success: true as const, status: await getMigrationStatus() };
  } catch (error) {
    return { success: false as const, error: getSafeActionError(error, "Veritabanına bağlanılamadı.") };
  }
}

export async function applyMigrationsAction() {
  await requireRole("ADMIN");
  try {
    const { results, status } = await applyPendingMigrations();
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { success: true as const, results, status };
  } catch (error) {
    return { success: false as const, error: getSafeActionError(error, "Migration işlemi başlatılamadı.") };
  }
}

const SEO_BATCH = 10;

/**
 * SEO bakımı: etiketi olmayan yayındaki haberler için etiket üretir; spotu (meta açıklama) eksik
 * ya da çok kısa olanların spotunu tamamlar. Başlık ve adres (URL) değiştirilmez, böylece
 * Google'daki mevcut bağlantılar bozulmaz. Her çalıştırmada en yeni 10 haber işlenir.
 */
export async function runSeoMaintenanceAction() {
  await requireRole("ADMIN");
  try {
    const { prisma } = await import("@/lib/prisma");
    const { attachTags, buildSeoPackage } = await import("@/lib/news/seo");
    const where = { status: "PUBLISHED", tags: { none: {} } };
    const articles = await prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: SEO_BATCH,
      select: { id: true, title: true, content: true, excerpt: true, lang: true, category: { select: { name: true } } },
    });
    let updated = 0;
    for (const a of articles) {
      const seo = await buildSeoPackage({ title: a.title, content: a.content, summary: a.excerpt, category: a.category?.name });
      if ((!a.excerpt || a.excerpt.trim().length < 80) && seo.description) {
        await prisma.article.update({ where: { id: a.id }, data: { excerpt: seo.description } });
      }
      await attachTags(a.id, seo.tags, a.lang);
      if (seo.tags.length) updated++;
    }
    const remaining = await prisma.article.count({ where });
    revalidatePath("/sitemap.xml");
    return { success: true as const, processed: articles.length, updated, remaining };
  } catch (error) {
    return { success: false as const, error: getSafeActionError(error, "SEO bakımı tamamlanamadı.") };
  }
}

export async function getIndexingStatusAction() {
  await requireRole("ADMIN");
  const { getIndexingLog, isIndexingConfigured } = await import("@/lib/google-indexing");
  return { configured: isIndexingConfigured(), log: await getIndexingLog() };
}

export async function testIndexingAction() {
  await requireRole("ADMIN");
  const { testIndexingAccess } = await import("@/lib/google-indexing");
  return testIndexingAccess();
}
