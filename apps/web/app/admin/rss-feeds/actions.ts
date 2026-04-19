"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { scanRssSource } from "@/lib/rss-scanner";
import { analyzeRssBatch } from "@/lib/ai-analyzer";

export async function getRssSources() {
  return prisma.rssFeedSource.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function createRssSource(data: {
  name: string;
  url: string;
  categoryHint?: string;
  language?: string;
}) {
  try {
    await prisma.rssFeedSource.create({
      data: {
        name: data.name.trim(),
        url: data.url.trim(),
        categoryHint: data.categoryHint || null,
        language: data.language || "tr",
      },
    });
    revalidatePath("/admin/rss-feeds");
    return { success: true };
  } catch {
    return { success: false, error: "Bu URL zaten kayıtlı veya bir hata oluştu." };
  }
}

export async function updateRssSource(
  id: string,
  data: { isActive?: boolean; name?: string; categoryHint?: string }
) {
  await prisma.rssFeedSource.update({ where: { id }, data });
  revalidatePath("/admin/rss-feeds");
  return { success: true };
}

export async function deleteRssSource(id: string) {
  await prisma.rssFeedSource.delete({ where: { id } });
  revalidatePath("/admin/rss-feeds");
  return { success: true };
}

export async function triggerRssScan(sourceId?: string) {
  try {
    if (sourceId) {
      const source = await prisma.rssFeedSource.findUnique({
        where: { id: sourceId },
        select: { id: true, url: true },
      });
      if (!source) return { success: false, error: "Kaynak bulunamadı." };
      const result = await scanRssSource(source.id, source.url);
      revalidatePath("/admin/rss-feeds");
      return { success: true, ...result };
    }
    // Tüm kaynakları tara
    const { scanAllActiveSources } = await import("@/lib/rss-scanner");
    const result = await scanAllActiveSources();
    revalidatePath("/admin/rss-feeds");
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function triggerAiAnalysis() {
  try {
    const result = await analyzeRssBatch();
    revalidatePath("/admin/rss-feeds");
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getRssSuggestions(filters?: {
  status?: string;
  minScore?: number;
}) {
  return prisma.rssFeedItem.findMany({
    where: {
      status: (filters?.status as "ANALYZED" | undefined) ?? "ANALYZED",
      dismissed: false,
      usedForArticle: false,
      ...(filters?.minScore !== undefined && {
        aiScore: { gte: filters.minScore },
      }),
    },
    orderBy: { aiScore: "desc" },
    take: 50,
    include: {
      source: { select: { name: true, url: true } },
    },
  });
}

export async function dismissSuggestion(id: string) {
  await prisma.rssFeedItem.update({
    where: { id },
    data: { status: "DISMISSED", dismissed: true },
  });
  revalidatePath("/admin/rss-feeds");
  revalidatePath("/author/suggestions");
  return { success: true };
}

export async function markAsUsed(id: string) {
  await prisma.rssFeedItem.update({
    where: { id },
    data: { usedForArticle: true },
  });
  revalidatePath("/admin/rss-feeds");
  revalidatePath("/author/suggestions");
  return { success: true };
}

export async function getRssStats() {
  const [total, pending, analyzed, covered, lowScore, dismissed, used] =
    await Promise.all([
      prisma.rssFeedItem.count(),
      prisma.rssFeedItem.count({ where: { status: "PENDING" } }),
      prisma.rssFeedItem.count({ where: { status: "ANALYZED", dismissed: false, usedForArticle: false } }),
      prisma.rssFeedItem.count({ where: { status: "COVERED" } }),
      prisma.rssFeedItem.count({ where: { status: "LOW_SCORE" } }),
      prisma.rssFeedItem.count({ where: { status: "DISMISSED" } }),
      prisma.rssFeedItem.count({ where: { usedForArticle: true } }),
    ]);

  return { total, pending, analyzed, covered, lowScore, dismissed, used };
}
