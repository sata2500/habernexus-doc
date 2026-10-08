"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActionIdentity } from "@/lib/server/rate-limit";
import { isBotUserAgent, recordUniqueView } from "@/lib/server/views";

/**
 * Haber görüntülenmesi. Tarayıcı, sayfa en az birkaç saniye ekranda kaldıktan sonra bir kez çağırır.
 * Sayılmayanlar: botlar, haberin kendi yazarı, aynı kişinin aynı gün içindeki tekrar ziyaretleri.
 */
export async function recordArticleView(articleId: string): Promise<{ counted: boolean }> {
  try {
    if (typeof articleId !== "string" || !/^[a-z0-9]{10,40}$/i.test(articleId)) return { counted: false };
    const h = await headers();
    const ua = h.get("user-agent");
    if (isBotUserAgent(ua)) return { counted: false };

    const session = await auth.api.getSession({ headers: h }).catch(() => null);
    const userId = session?.user?.id;
    if (userId) {
      const own = await prisma.article.count({ where: { id: articleId, authorId: userId } });
      if (own > 0) return { counted: false };
    }
    const visitor = userId ? `u:${userId}` : `g:${await getActionIdentity()}|${ua}`;
    return { counted: await recordUniqueView(articleId, visitor) };
  } catch (error) {
    console.error("[Görüntülenme] Kaydedilemedi:", error);
    return { counted: false };
  }
}
