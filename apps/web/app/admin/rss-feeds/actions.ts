"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { scanRssSource } from "@/lib/rss-scanner";
import { analyzeRssBatch } from "@/lib/ai-analyzer";
import { writeArticleWithAI, writeBatchArticlesWithAI } from "@/lib/ai-writer";
import { getAppUrl } from "@/lib/utils";

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

export async function triggerAiAnalysis(itemId?: string) {
  try {
    if (itemId) {
      // Tek bir öğeyi analiz et
      await prisma.rssFeedItem.update({
        where: { id: itemId },
        data: { status: "PENDING", aiAnalysis: {} }
      });
    }

    const result = await analyzeRssBatch();
    revalidatePath("/admin/rss-feeds");
    revalidatePath("/author/suggestions");
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function reAnalyzeSuggestion(id: string) {
  try {
    await prisma.rssFeedItem.update({
      where: { id },
      data: { status: "PENDING", aiAnalysis: {} },
    });
    const result = await analyzeRssBatch();
    revalidatePath("/admin/rss-feeds");
    revalidatePath("/author/suggestions");
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getRssSuggestions(filters?: {
  status?: string;
  minScore?: number;
  search?: string;
  category?: string;
}) {
  const status = filters?.status || "ANALYZED";
  
  return prisma.rssFeedItem.findMany({
    where: {
      status: status as any,
      ...(status === "ANALYZED" && { dismissed: false }), // ANALYZED durumunda dismissed olanları gösterme
      usedForArticle: false,
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { excerpt: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...(filters?.category && {
        aiAnalysis: { path: ["suggestedCategory"], equals: filters.category },
      }),
      ...(filters?.minScore !== undefined && {
        aiScore: { gte: filters.minScore },
      }),
    },
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: {
      source: { select: { name: true, url: true } },
    },
  });
}

export async function revertToAnalyzed(id: string) {
  await prisma.rssFeedItem.update({
    where: { id },
    data: { status: "ANALYZED", dismissed: false },
  });
  revalidatePath("/admin/rss-feeds");
  revalidatePath("/author/suggestions");
  return { success: true };
}

export async function approveSuggestion(id: string) {
  await prisma.rssFeedItem.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  revalidatePath("/admin/rss-feeds");
  revalidatePath("/author/suggestions");
  return { success: true };
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

export async function triggerAiWriter(suggestionId: string) {
  try {
    const result = await writeArticleWithAI(suggestionId);
    revalidatePath("/admin/rss-feeds");
    revalidatePath("/");
    return result;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateAiWriterSettings(data: { 
  prompt: string; 
  imagePrompt: string;
  model: string;
  imageModel: string;
  useRssImage: boolean;
  searchEnabled: boolean;
  analyzerModel: string;
}) {
  await prisma.systemSettings.update({
    where: { id: "global" },
    data: {
      aiWriterPrompt: data.prompt,
      aiWriterImagePrompt: data.imagePrompt,
      aiWriterModel: data.model,
      aiWriterImageModel: data.imageModel,
      aiWriterUseRssImage: data.useRssImage,
      aiWriterSearchEnabled: data.searchEnabled,
      aiAnalyzerModel: data.analyzerModel,
    },
  });
  revalidatePath("/admin/rss-feeds");
  return { success: true };
}
export async function triggerBatchAiWriter(count: number) {
  try {
    const suggestions = await prisma.rssFeedItem.findMany({
      where: {
        status: { in: ["ANALYZED", "APPROVED"] },
        dismissed: false,
        usedForArticle: false,
      },
      orderBy: { aiScore: "desc" },
      take: count,
    });

    if (suggestions.length === 0) {
      return { success: false, error: "Yazılacak yeni haber önerisi bulunamadı." };
    }

    const APP_URL = getAppUrl();
    const isLocal = APP_URL.includes("localhost");
    const hasQStash = !!process.env.QSTASH_TOKEN;

    // EĞER LOCALHOST'taysak veya QStash yoksa doğrudan yaz (Senkron Fallback)
    if (isLocal || !hasQStash) {
      console.log(`[AI Writer] Yerel ortam tespit edildi, ${suggestions.length} haber sırayla yazılıyor...`);
      const results = await writeBatchArticlesWithAI(count);
      revalidatePath("/admin/ai-writer");
      revalidatePath("/admin/rss-feeds");
      revalidatePath("/");
      return { success: true, enqueued: results.length, mode: "sync", results };
    }

    // Prodüksiyon ortamında QStash kuyruğuna ekle
    const { Client } = await import("@upstash/qstash");
    const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });

    const results = [];
    for (const item of suggestions) {
      try {
        await qstash.publishJSON({
          url: `${APP_URL}/api/ai-writer/worker`,
          body: { suggestionId: item.id },
        });
        results.push({ id: item.id, status: "ENQUEUED" });
      } catch (err) {
        results.push({ id: item.id, status: "FAILED", error: String(err) });
      }
    }

    revalidatePath("/admin/ai-writer");
    return { success: true, enqueued: results.length, mode: "async", results };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateAiWriterAutomation(data: {
  enabled: boolean;
  count: number;
  cron: string;
}) {
  try {
    await prisma.systemSettings.update({
      where: { id: "global" },
      data: {
        aiWriterAutoEnabled: data.enabled,
        aiWriterAutoCount: data.count,
        aiWriterAutoCron: data.cron,
      },
    });

    if (data.enabled) {
      await setupAiWriterCron(data.cron);
    } else {
      // Devre dışı bırakıldığında QStash görevini sil
      const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
      if (settings?.qStashAiWriterId) {
        const { Client } = await import("@upstash/qstash");
        const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });
        try {
          await qstash.schedules.delete(settings.qStashAiWriterId);
        } catch (e) { console.error(e); }
        await prisma.systemSettings.update({
          where: { id: "global" },
          data: { qStashAiWriterId: null },
        });
      }
    }

    revalidatePath("/admin/ai-writer");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function setupAiWriterCron(cron: string) {
  const { Client } = await import("@upstash/qstash");
  const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });
  const APP_URL = getAppUrl();
  
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
  if (settings?.qStashAiWriterId) {
    try {
      await qstash.schedules.delete(settings.qStashAiWriterId);
    } catch (e) { console.error(e); }
  }

  const schedule = await qstash.schedules.create({
    destination: `${APP_URL}/api/cron/ai-writer`,
    cron: cron,
  });

  await prisma.systemSettings.update({
    where: { id: "global" },
    data: { qStashAiWriterId: schedule.scheduleId },
  });
}

export async function getRssStats() {
  const [total, pending, analyzed, approved, covered, lowScore, dismissed, used] =
    await Promise.all([
      prisma.rssFeedItem.count(),
      prisma.rssFeedItem.count({ where: { status: "PENDING" } }),
      prisma.rssFeedItem.count({ where: { status: "ANALYZED", dismissed: false, usedForArticle: false } }),
      prisma.rssFeedItem.count({ where: { status: "APPROVED", dismissed: false, usedForArticle: false } }),
      prisma.rssFeedItem.count({ where: { status: "COVERED" } }),
      prisma.rssFeedItem.count({ where: { status: "LOW_SCORE" } }),
      prisma.rssFeedItem.count({ where: { status: "DISMISSED" } }),
      prisma.rssFeedItem.count({ where: { usedForArticle: true } }),
    ]);

  return { total, pending, analyzed, approved, covered, lowScore, dismissed, used };
}
