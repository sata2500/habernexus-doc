"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { actionError, requireRole } from "@/lib/server/authz";
import type { ActionResult } from "@/lib/types";

/** Karar Merkezi'nde değerlendirilmiş, yazılmayı bekleyen konular (en yüksek puan önce). */
export async function getAuthorSuggestions() {
  await requireRole("AUTHOR", "ADMIN");
  const stories = await prisma.newsStory.findMany({
    where: { status: "READY", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ pinned: "desc" }, { score: "desc" }],
    take: 24,
    include: {
      items: {
        orderBy: { publishedAt: "asc" },
        take: 1,
        select: { title: true, url: true, excerpt: true, imageUrl: true, source: { select: { name: true } } },
      },
    },
  });
  return stories
    .filter((s) => s.items.length > 0)
    .map((s) => {
      const first = s.items[0];
      return {
        id: s.id,
        title: first.title,
        url: first.url,
        excerpt: s.summary || first.excerpt,
        imageUrl: first.imageUrl,
        publishedAt: s.firstSeenAt,
        aiScore: s.score,
        status: s.pinned ? "APPROVED" : "ANALYZED",
        aiAnalysis: {
          suggestedTitles: s.headline ? [s.headline] : [],
          suggestedCategory: s.categoryName ?? undefined,
          reasoning: s.reason ?? undefined,
        },
        source: { name: s.sourceCount > 1 ? `${first.source.name} +${s.sourceCount - 1} kaynak` : first.source.name },
      };
    });
}

function revalidate() {
  revalidatePath("/author/suggestions");
  revalidatePath("/author");
  revalidatePath("/admin/decision-center");
}

const validId = (id: unknown): id is string => typeof id === "string" && !!id && id.length <= 100;

export async function dismissSuggestionByAuthor(id: string): Promise<ActionResult> {
  try {
    await requireRole("AUTHOR", "ADMIN");
    if (!validId(id)) return { success: false, error: "Geçersiz konu." };
    await prisma.newsStory.updateMany({
      where: { id, status: { in: ["NEW", "READY"] } },
      data: { status: "DISMISSED", pinned: false, score: 0, reason: "Yazar ilginç bulmadı" },
    });
    revalidate();
    return { success: true };
  } catch (err) {
    return actionError(err, "Öneri kaldırılamadı.");
  }
}

/**
 * Yazar konuyu üstlenir: AI Yazar'ın ve diğer yazarların aynı konuyu yazmaması için sıradan çıkarılır.
 * Tek adımlık koşullu güncelleme: iki yazar aynı anda tıklarsa yalnızca biri üstlenir.
 * (Yazar vazgeçerse konu Karar Merkezi'nden geri alınabilir.)
 */
export async function markSuggestionAsUsed(id: string): Promise<ActionResult> {
  try {
    const session = await requireRole("AUTHOR", "ADMIN");
    if (!validId(id)) return { success: false, error: "Geçersiz konu." };
    const claimed = await prisma.newsStory.updateMany({
      where: { id, status: { in: ["NEW", "READY"] } },
      data: { status: "DISMISSED", pinned: false, score: 0, reason: `${session.user.name ?? "Bir yazar"} bu konuyu üstlendi` },
    });
    revalidate();
    if (claimed.count !== 1) {
      return { success: false, error: "Bu konu az önce başka bir yazar ya da AI Yazar tarafından üstlenildi." };
    }
    return { success: true };
  } catch (err) {
    return actionError(err, "Konu üstlenilemedi.");
  }
}
