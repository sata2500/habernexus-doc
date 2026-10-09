import "server-only";

import { stripLeadingTitleHeading } from "@/lib/article-content";
import { prisma } from "@/lib/prisma";
import { AiError, cleanHtmlResponse, generateText, parseJsonResponse } from "@/lib/ai/client";
import { keyTokens, signature } from "./text";
import { attachTags, buildSeoPackage, uniqueArticleSlug } from "./seo";
import { buildImagePrompt, buildWriterSystemPrompt } from "./writing-guide";
import { invalidateArticle } from "@/lib/server/article-cache";
import { addToMediaLibrary, afterPublish, pickPersona, produceCoverImage } from "@/lib/ai-writer";

const HOUR = 3_600_000;

/** Trend kelimesi son 2 günde yazdığımız bir haberin başlığında tamamen geçiyor mu? */
export async function findTrendCoverage(keyword: string) {
  const tokens = keyTokens(keyword);
  if (tokens.length === 0) return null;
  const [story, articles] = await Promise.all([
    prisma.newsStory.findFirst({ where: { trendKeyword: keyword, status: "PUBLISHED", articleId: { not: null } }, select: { article: { select: { id: true, title: true, slug: true } } } }),
    prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - 48 * HOUR) } },
      select: { id: true, title: true, slug: true },
      take: 400,
      orderBy: { publishedAt: "desc" },
    }),
  ]);
  if (story?.article) return story.article;
  return articles.find((a) => {
    const t = new Set(keyTokens(a.title));
    return tokens.every((k) => t.has(k));
  }) ?? null;
}

/**
 * RSS'te karşılığı olmayan bir trend için haber yazar (web araması admin panelinde açıksa aramayla).
 * Aynı trend için daha önce haber yazıldıysa ya da konu son 2 günde işlendiyse yazmaz.
 */
export async function writeTrendArticle(trendId: string) {
  try {
    const trend = await prisma.googleTrend.findUnique({ where: { id: trendId } });
    if (!trend) return { success: false as const, error: "Trend bulunamadı." };

    const covered = await findTrendCoverage(trend.keyword);
    if (covered) return { success: false as const, error: `Bu konu zaten yayında: "${covered.title}"` };

    const [adminUser, settings, categories] = await Promise.all([
      prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } }),
      prisma.systemSettings.findFirst(),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);
    if (!adminUser) return { success: false as const, error: "Admin kullanıcı bulunamadı." };

    // Kategori yazımdan sonra belli olduğu için kategorisiz (genel) yazar profili kullanılır
    const persona = await pickPersona(null);
    // Web araması yalnızca admin panelinde açıksa kullanılır
    const useSearch = !!settings?.aiWriterSearchEnabled;
    const { text } = await generateText("writer", {
      // Çıktı biçimini (JSON) istem tanımlar; içerik HTML kuralları JSON şablonunda
      system: buildWriterSystemPrompt({ publication: settings?.aiWriterPrompt, persona: persona?.prompt, output: "none" }),
      prompt: `Bugün: ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "long", timeStyle: "short" })}
Türkiye'de şu an çok aranan konu: "${trend.keyword}"
${useSearch ? "Bu konuyu web/Google araması ile araştır; i" : "I"}nsanların neden aradığını ve son gelişmeyi doğru, tarafsız ve özgün bir haberle anlat.
Doğrulanamayan bilgi uydurma.

Yanıtı SADECE şu JSON biçiminde ver:
{ "title": "En fazla 90 karakterlik başlık", "excerpt": "1-2 cümlelik spot", "category": "${categories.map((c) => c.name).join(" | ") || "Gündem"}", "content": "HTML gövde (h2, h3, p, strong, ul, li; h1, markdown ve başlık tekrarı yok)" }`,
      search: useSearch,
      temperature: 0.6,
    });
    const parsed = parseJsonResponse<{ title?: string; excerpt?: string; content?: string; category?: string }>(text);
    const rawContent = cleanHtmlResponse(parsed.content || "");
    if (!rawContent) return { success: false as const, error: "İçerik üretilemedi." };

    const draftTitle = parsed.title?.trim().slice(0, 140) || `${trend.keyword}: Son gelişmeler`;
    const categoryId = categories.find((c) => c.name.toLocaleLowerCase("tr") === parsed.category?.trim().toLocaleLowerCase("tr"))?.id ?? null;
    const seo = await buildSeoPackage({ title: draftTitle, content: rawContent, summary: parsed.excerpt, category: parsed.category });
    const title = seo.title;
    const sig = signature(title);
    const content = stripLeadingTitleHeading(title, stripLeadingTitleHeading(draftTitle, rawContent));
    // Kapak görseli (admin paneli ve yazar profili görsel talimatlarıyla); trend haberlerinin RSS görseli yoktur
    const coverImage = await produceCoverImage(
      buildImagePrompt({ publication: settings?.aiWriterImagePrompt, persona: persona?.imagePrompt, title }),
      null,
      false,
    );
    await addToMediaLibrary(coverImage, adminUser.id);

    // Haber ve Karar Merkezi kaydı birlikte: trend "yazıldı" görünür ve tekrar yazılmaz
    const article = await prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          title,
          slug: await uniqueArticleSlug(title, tx),
          content,
          excerpt: seo.description || parsed.excerpt?.trim().slice(0, 300) || null,
          coverImage,
          aiPersonaId: persona?.id ?? null,
          status: "PUBLISHED",
          authorId: adminUser.id,
          categoryId,
          publishedAt: new Date(),
          lang: "tr",
        },
      });
      await tx.newsStory.create({
        data: {
          title, headline: title, tokens: sig.tokens, entities: sig.entities, status: "PUBLISHED",
          trendKeyword: trend.keyword, trendScore: trend.trafficScore, articleId: created.id, sourceCount: 0, itemCount: 0,
          categoryName: parsed.category ?? null, reason: "Google Trends'ten yazıldı",
        },
      });
      return created;
    });
    await attachTags(article.id, seo.tags);
    await invalidateArticle(article.slug);
    // Google ve Telegram bildirimi, ardından analiz ve gerekirse özgünleştirme
    await afterPublish(article);
    return { success: true as const, articleId: article.id, title: article.title, slug: article.slug };
  } catch (error) {
    const message = error instanceof AiError ? `${error.message}${error.raw ? ` Ayrıntı: ${error.raw}` : ""}` : error instanceof Error ? error.message : String(error);
    console.error("[Trend Writer]", message);
    return { success: false as const, error: message };
  }
}
