"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { scanRssSource } from "@/lib/rss-scanner";
import { analyzeRssBatch, cleanupOldItems } from "@/lib/ai-analyzer";
import { writeArticleWithAI, writeBatchArticlesWithAI } from "@/lib/ai-writer";
import { getAppUrl } from "@/lib/utils";
import { requireRole, getSafeActionError } from "@/lib/server/authz";
import {
  AiBatchCountSchema,
  AiWriterAutomationSchema,
  AiWriterSettingsSchema,
  RssSourceIdSchema,
  RssSourceSchema,
  RssSourceUpdateSchema,
  RssSuggestionFiltersSchema,
} from "@/lib/validation/schemas";

async function assertAdmin() {
  return requireRole("ADMIN");
}

function parseActionId(id: string) {
  const parsed = RssSourceIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function getRssSources() {
  await assertAdmin();

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
  await assertAdmin();

  const parsed = RssSourceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Geçersiz RSS kaynağı." };
  }

  try {
    await prisma.rssFeedSource.create({
      data: {
        name: parsed.data.name,
        url: parsed.data.url,
        categoryHint: parsed.data.categoryHint || null,
        language: parsed.data.language,
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
  await assertAdmin();

  const parsedId = RssSourceIdSchema.safeParse(id);
  const parsedData = RssSourceUpdateSchema.safeParse(data);
  if (!parsedId.success || !parsedData.success) {
    return { success: false, error: "Geçersiz RSS kaynağı verisi." };
  }

  await prisma.rssFeedSource.update({ where: { id: parsedId.data }, data: parsedData.data });
  revalidatePath("/admin/rss-feeds");
  return { success: true };
}

export async function deleteRssSource(id: string) {
  await assertAdmin();
  const parsedId = RssSourceIdSchema.safeParse(id);
  if (!parsedId.success) return { success: false, error: "Geçersiz RSS kaynağı." };
  await prisma.rssFeedSource.delete({ where: { id: parsedId.data } });
  revalidatePath("/admin/rss-feeds");
  return { success: true };
}

export async function triggerRssScan(sourceId?: string) {
  await assertAdmin();

  const parsedId = sourceId ? RssSourceIdSchema.safeParse(sourceId) : null;
  if (parsedId && !parsedId.success) {
    return { success: false, error: "Geçersiz RSS kaynağı." };
  }

  try {
    if (parsedId?.success) {
      const source = await prisma.rssFeedSource.findUnique({
        where: { id: parsedId.data },
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
    return { success: false, error: getSafeActionError(err, "RSS işlemi gerçekleştirilemedi.") };
  }
}

export async function triggerAiAnalysis(itemId?: string) {
  await assertAdmin();

  const parsedItemId = itemId ? RssSourceIdSchema.safeParse(itemId) : null;
  if (parsedItemId && !parsedItemId.success) {
    return { success: false, error: "Geçersiz haber önerisi." };
  }

  try {
    if (parsedItemId?.success) {
      // Tek bir öğeyi analiz et
      await prisma.rssFeedItem.update({
        where: { id: parsedItemId.data },
        data: { status: "PENDING", aiAnalysis: {} }
      });
    }

    const result = await analyzeRssBatch();
    revalidatePath("/admin/rss-feeds");
    revalidatePath("/author/suggestions");
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: getSafeActionError(err, "RSS işlemi gerçekleştirilemedi.") };
  }
}

export async function reAnalyzeSuggestion(id: string) {
  await assertAdmin();
  const parsedId = parseActionId(id);
  if (!parsedId) return { success: false, error: "Geçersiz haber önerisi." };

  try {
    await prisma.rssFeedItem.update({
      where: { id: parsedId },
      data: { status: "PENDING", aiAnalysis: {} },
    });
    const result = await analyzeRssBatch();
    revalidatePath("/admin/rss-feeds");
    revalidatePath("/author/suggestions");
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: getSafeActionError(err, "RSS işlemi gerçekleştirilemedi.") };
  }
}

export async function triggerRssCleanup() {
  await assertAdmin();

  try {
    const count = await cleanupOldItems();
    revalidatePath("/admin/rss-feeds");
    return { success: true, count };
  } catch (err) {
    return { success: false, error: getSafeActionError(err, "RSS işlemi gerçekleştirilemedi.") };
  }
}

export async function getRssSuggestions(filters?: {
  status?: string;
  minScore?: number;
  search?: string;
  category?: string;
}) {
  await assertAdmin();
  const parsedFilters = RssSuggestionFiltersSchema.safeParse(filters);
  if (!parsedFilters.success) return [];
  const safeFilters = parsedFilters.data;
  const status = safeFilters?.status || "ANALYZED";

  return prisma.rssFeedItem.findMany({
    where: {
      status: status as "PENDING" | "ANALYZED" | "APPROVED" | "COVERED" | "DISMISSED" | "LOW_SCORE",
      ...(status === "ANALYZED" && { dismissed: false }), // ANALYZED durumunda dismissed olanları gösterme
      usedForArticle: false,
      ...(safeFilters?.search && {
        OR: [
          { title: { contains: safeFilters.search, mode: "insensitive" } },
          { excerpt: { contains: safeFilters.search, mode: "insensitive" } },
        ],
      }),
      ...(safeFilters?.category && {
        aiAnalysis: { path: ["suggestedCategory"], equals: safeFilters.category },
      }),
      ...(safeFilters?.minScore !== undefined && {
        aiScore: { gte: safeFilters.minScore },
      }),
    },
    orderBy: [{ aiScore: "desc" }, { publishedAt: "desc" }],
    take: 100,
    include: {
      source: { select: { name: true, url: true } },
      googleTrendItems: {
        include: {
          trend: { select: { id: true, keyword: true, searchVolume: true, trafficScore: true } },
        },
      },
    },
  });
}

export async function getGoogleTrendOpportunities() {
  await assertAdmin();
  const activeTrends = await prisma.googleTrend.findMany({
    orderBy: { trafficScore: "desc" },
    take: 10,
    include: {
      items: {
        include: {
          rssItem: { select: { id: true, title: true } },
        },
      },
    },
  });

  return activeTrends;
}

export async function revertToAnalyzed(id: string) {
  await assertAdmin();
  const parsedId = parseActionId(id);
  if (!parsedId) return { success: false, error: "Geçersiz haber önerisi." };
  await prisma.rssFeedItem.update({
    where: { id: parsedId },
    data: { status: "ANALYZED", dismissed: false },
  });
  revalidatePath("/admin/rss-feeds");
  revalidatePath("/author/suggestions");
  return { success: true };
}

export async function approveSuggestion(id: string) {
  await assertAdmin();
  const parsedId = parseActionId(id);
  if (!parsedId) return { success: false, error: "Geçersiz haber önerisi." };
  await prisma.rssFeedItem.update({
    where: { id: parsedId },
    data: { status: "APPROVED" },
  });
  revalidatePath("/admin/rss-feeds");
  revalidatePath("/author/suggestions");
  return { success: true };
}

export async function dismissSuggestion(id: string) {
  await assertAdmin();
  const parsedId = parseActionId(id);
  if (!parsedId) return { success: false, error: "Geçersiz haber önerisi." };
  await prisma.rssFeedItem.update({
    where: { id: parsedId },
    data: { status: "DISMISSED", dismissed: true },
  });
  revalidatePath("/admin/rss-feeds");
  revalidatePath("/author/suggestions");
  return { success: true };
}

export async function markAsUsed(id: string) {
  await assertAdmin();
  const parsedId = parseActionId(id);
  if (!parsedId) return { success: false, error: "Geçersiz haber önerisi." };
  await prisma.rssFeedItem.update({
    where: { id: parsedId },
    data: { usedForArticle: true },
  });
  revalidatePath("/admin/rss-feeds");
  revalidatePath("/author/suggestions");
  return { success: true };
}

export async function triggerAiWriter(suggestionId: string) {
  await assertAdmin();

  const parsedId = RssSourceIdSchema.safeParse(suggestionId);
  if (!parsedId.success) return { success: false, error: "Geçersiz haber önerisi." };

  try {
    const result = await writeArticleWithAI(parsedId.data);
    revalidatePath("/admin/rss-feeds");
    revalidatePath("/");
    return result;
  } catch (err) {
    return { success: false, error: getSafeActionError(err, "RSS işlemi gerçekleştirilemedi.") };
  }
}

export async function updateAiWriterSettings(data: {
  aiProvider: string;
  prompt: string;
  imagePrompt: string;
  model: string;
  imageModel: string;
  useRssImage: boolean;
  searchEnabled: boolean;
  analyzerModel: string;
}) {
  await assertAdmin();
  const parsed = AiWriterSettingsSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Geçersiz AI Writer ayarları." };
  await prisma.systemSettings.update({
    where: { id: "global" },
    data: {
      aiProvider: parsed.data.aiProvider,
      aiWriterPrompt: parsed.data.prompt,
      aiWriterImagePrompt: parsed.data.imagePrompt,
      aiWriterModel: parsed.data.model,
      aiWriterImageModel: parsed.data.imageModel,
      aiWriterUseRssImage: parsed.data.useRssImage,
      aiWriterSearchEnabled: parsed.data.searchEnabled,
      aiAnalyzerModel: parsed.data.analyzerModel,
    },
  });
  revalidatePath("/admin/rss-feeds");
  return { success: true };
}
export async function triggerBatchAiWriter(count: number) {
  await assertAdmin();

  const parsedCount = AiBatchCountSchema.safeParse(count);
  if (!parsedCount.success) return { success: false, error: "Batch sayısı 1 ile 10 arasında olmalıdır." };

  try {
    const suggestions = await prisma.rssFeedItem.findMany({
      where: {
        status: { in: ["ANALYZED", "APPROVED"] },
        dismissed: false,
        usedForArticle: false,
      },
      orderBy: { aiScore: "desc" },
      take: parsedCount.data,
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
      const results = await writeBatchArticlesWithAI(parsedCount.data);
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
        results.push({ id: item.id, status: "FAILED", error: "Kuyruğa alınamadı." });
        console.error("AI Writer queue error:", err);
      }
    }

    revalidatePath("/admin/ai-writer");
    return { success: true, enqueued: results.length, mode: "async", results };
  } catch (err) {
    return { success: false, error: getSafeActionError(err, "RSS işlemi gerçekleştirilemedi.") };
  }
}

export async function updateAiWriterAutomation(data: {
  enabled: boolean;
  count: number;
  cron: string;
}) {
  await assertAdmin();
  const parsed = AiWriterAutomationSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Geçersiz AI Writer otomasyon ayarları." };

  try {
    await prisma.systemSettings.update({
      where: { id: "global" },
      data: {
aiWriterAutoEnabled: parsed.data.enabled,
        aiWriterAutoCount: parsed.data.count,
        aiWriterAutoCron: parsed.data.cron,
      },
    });

    if (data.enabled) {
      await setupAiWriterCron(parsed.data.cron);
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
    return { success: false, error: getSafeActionError(err, "RSS işlemi gerçekleştirilemedi.") };
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
  await assertAdmin();
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
