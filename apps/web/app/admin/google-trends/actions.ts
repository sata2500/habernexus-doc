"use me";
"use server";

import { prisma } from "@/lib/prisma";
import { syncGoogleTrends, matchTrendsWithRss } from "@/lib/google-trends";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function triggerSyncGoogleTrends() {
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
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}

export async function generateArticleFromTrend(trendId: string) {
  try {
    const trend = await prisma.googleTrend.findUnique({
      where: { id: trendId },
    });

    if (!trend) throw new Error("Trend bulunamadı.");

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) throw new Error("Admin kullanıcı bulunamadı.");

    const settings = await prisma.systemSettings.findFirst();
    const writerModelName = settings?.aiWriterModel || "google/gemini-2.0-flash-001";
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) throw new Error("OPENROUTER_API_KEY bulunamadı.");

    // Google Arama aracı ile makale yaz promptu
    const prompt = `Aşağıdaki Google Trends konusunu derinlemesine araştır ve güncel bilgilerle profesyonel bir haber makalesi yaz.
Konu/Keyword: "${trend.keyword}"
Format: HTML (h2, p, strong). En az 500 kelime. Tarafsız, ilgi çekici ve özgün bir haber dili kullan.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://habernexus.com",
        "X-Title": "Haber Nexus Trend AI Writer",
      },
      body: JSON.stringify({
        model: writerModelName,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "openrouter:web_search" }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "AI Writer Error");

    const content = data.choices?.[0]?.message?.content || "";
    if (!content) throw new Error("İçerik üretilemedi.");

    const title = `${trend.keyword} Gündeminde Son Gelişmeler`;
    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content,
        excerpt: `Google Trends'te popüler olan "${trend.keyword}" konusu hakkında en son gelişmeler ve analizler.`,
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
    return { success: true, articleId: article.id, title: article.title };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Trend Haber Üretim Hatası:", error);
    return { success: false, error: errMsg };
  }
}
