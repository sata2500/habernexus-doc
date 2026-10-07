"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, adminOnly } from "@/lib/server/authz";
import { invalidateArticles } from "@/lib/server/article-cache";

const IdsSchema = z.array(z.string().min(1).max(100)).min(1).max(200);

/**
 * Medyayı depodan ve veritabanından siler; kullanıldığı yerlerdeki bağlantıları temizler.
 * Slaytlar görsel olmadan çalışamadığı için o görseli kullanan slaytlar da silinir.
 */
export async function deleteMediaItems(ids: string[]) {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = IdsSchema.safeParse(ids);
  if (!parsed.success) return { success: false as const, error: "Geçersiz seçim." };

  try {
    const items = await prisma.media.findMany({ where: { id: { in: parsed.data } }, select: { id: true, url: true } });
    if (items.length === 0) return { success: true as const, deleted: 0 };
    const urls = items.map((m) => m.url);

    try {
      await del(urls);
    } catch (e) {
      console.warn("[Media] Bazı dosyalar depodan silinemedi:", e);
    }

    // Kapak görseli silinen haberlerin sayfa önbellekleri de temizlenir
    const affected = await prisma.article.findMany({ where: { coverImage: { in: urls } }, select: { slug: true } });
    await prisma.$transaction([
      prisma.article.updateMany({ where: { coverImage: { in: urls } }, data: { coverImage: null } }),
      prisma.user.updateMany({ where: { image: { in: urls } }, data: { image: null } }),
      prisma.aiPersona.updateMany({ where: { image: { in: urls } }, data: { image: null } }),
      prisma.slide.deleteMany({ where: { imageUrl: { in: urls } } }),
      prisma.media.deleteMany({ where: { id: { in: items.map((m) => m.id) } } }),
    ]);

    revalidatePath("/admin/media");
    await invalidateArticles(affected.map((a) => a.slug));
    return { success: true as const, deleted: items.length };
  } catch (error) {
    console.error("[Media] Silme hatası:", error);
    return { success: false as const, error: "Medya silinemedi." };
  }
}
