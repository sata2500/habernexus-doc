"use server";

import { AiError, cleanHtmlResponse, generateText, parseJsonResponse } from "@/lib/ai/client";

import { prisma } from "@/lib/prisma";
import { syncGoogleTrends, matchTrendsWithRss } from "@/lib/google-trends";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/server/authz";

export async function triggerSyncGoogleTrends() {
  await requireRole("ADMIN");
  try {
    const syncRes = await syncGoogleTrends();
    const matchRes = await matchTrendsWithRss();

    revalidatePath("/admin/google-trends");
    return {
      success: true,
      synced: syncRes.synced,
      matched: matchRes.matched,
      autoPublishCount: matchRes.autoPublishCount,
      contentGapCount: matchRes.contentGapCount,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof AiError
      ? `${error.message}${error.raw ? ` Ayrıntı: ${error.raw}` : ""}`
      : error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}

export async function generateArticleFromTrend(trendId: string) {
  await requireRole("ADMIN");
  try {
    const trend = await prisma.googleTrend.findUnique({
      where: { id: trendId },
    });

    if (!trend) throw new Error("Trend bulunamadı.");

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) throw new Error("Admin kullanıcı bulunamadı.");

    const settings = await prisma.systemSettings.findFirst();

    // Güncel bilgi için arama açık; başlık, özet ve gövde tek JSON'da istenir
    const { text } = await generateText("writer", {
      system: settings?.aiWriterPrompt || "Sen profesyonel bir haber editörüsün.",
      prompt: `Aşağıdaki Google Trends konusunu web/Google araması ile araştır ve güncel bilgilerle özgün bir haber yaz.
Konu: "${trend.keyword}"

Yanıtı SADECE şu JSON biçiminde ver:
{ "title": "En fazla 90 karakterlik haber başlığı", "excerpt": "1-2 cümlelik spot", "content": "HTML gövde (h2, p, strong; en az 500 kelime; başlık yok)" }`,
      search: true,
      temperature: 0.7,
    });
    const parsed = parseJsonResponse<{ title?: string; excerpt?: string; content?: string }>(text);
    const content = cleanHtmlResponse(parsed.content || "");
    if (!content) throw new Error("İçerik üretilemedi.");

    const title = parsed.title?.trim().slice(0, 140) || `${trend.keyword}: Son Gelişmeler`;
    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content,
        excerpt: parsed.excerpt?.trim().slice(0, 300) || `"${trend.keyword}" hakkında son gelişmeler.`,
        status: "PUBLISHED",
        authorId: adminUser.id,
        publishedAt: new Date(),
        lang: "tr",
      },
    });

    // Trend tablosundaki aksiyonu güncelle
    await prisma.googleTrendItem.create({
      data: {
        trendId: trend.id,
        matchScore: 100,
        actionTaken: "SEARCH_GENERATED",
      },
    });

    revalidatePath("/admin/google-trends");
    revalidatePath("/admin/articles");
    return { success: true, articleId: article.id, title: article.title, slug: article.slug };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Trend Haber Üretim Hatası:", error);
    return { success: false, error: errMsg };
  }
}
