"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActionIdentity } from "@/lib/server/rate-limit";
import { isBotUserAgent, recordUniqueView } from "@/lib/server/views";

/**
 * Haber görüntülenmesi. Tarayıcı, sayfa birkaç saniye ekranda kalınca ya da haber dinlenmeye başlanınca bir kez çağırır.
 * Sayılmayanlar: botlar, haberi kendisi yazan kişi (yapay zekâ haberleri hariç), aynı kişinin aynı gün içindeki tekrar ziyaretleri.
 */
export async function recordArticleView(articleId: string): Promise<{ counted: boolean; viewCount?: number }> {
  try {
    if (typeof articleId !== "string" || !/^[a-z0-9]{10,40}$/i.test(articleId)) return { counted: false };
    const h = await headers();
    const ua = h.get("user-agent");
    if (isBotUserAgent(ua)) return { counted: false };

    const session = await auth.api.getSession({ headers: h }).catch(() => null);
    const userId = session?.user?.id;
    if (userId) {
      // Yapay zekâ haberleri teknik olarak ilk yönetici hesabına kayıtlıdır; yönetici onların yazarı sayılmaz
      const own = await prisma.article.count({ where: { id: articleId, authorId: userId, aiPersonaId: null } });
      if (own > 0) return { counted: false };
    }
    const visitor = userId ? `u:${userId}` : `g:${await getActionIdentity()}|${ua}`;
    const counted = await recordUniqueView(articleId, visitor);
    // Haber sayfası önbellekte (ISR) olduğu için sayfadaki sayı eski kalabilir: güncel sayı döndürülür
    const fresh = await prisma.article.findFirst({ where: { id: articleId, status: "PUBLISHED" }, select: { viewCount: true } });
    return { counted, viewCount: fresh?.viewCount };
  } catch (error) {
    console.error("[Görüntülenme] Kaydedilemedi:", error);
    return { counted: false };
  }
}
