"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/server/authz";

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
  revalidatePath("/admin/karar-merkezi");
}

export async function dismissSuggestionByAuthor(id: string) {
  await requireRole("AUTHOR", "ADMIN");
  await prisma.newsStory.updateMany({
    where: { id, status: { in: ["NEW", "READY"] } },
    data: { status: "DISMISSED", pinned: false, score: 0, reason: "Yazar ilginç bulmadı" },
  });
  revalidate();
  return { success: true };
}

/** Yazar konuyu üstlendi: AI Yazar'ın aynı konuyu yazmaması için sıradan çıkarılır. */
export async function markSuggestionAsUsed(id: string) {
  const session = await requireRole("AUTHOR", "ADMIN");
  await prisma.newsStory.updateMany({
    where: { id, status: { in: ["NEW", "READY"] } },
    data: { status: "DISMISSED", pinned: false, score: 0, reason: `${session.user.name ?? "Bir yazar"} bu konuyu üstlendi` },
  });
  revalidate();
  return { success: true };
}
