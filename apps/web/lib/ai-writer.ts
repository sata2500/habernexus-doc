import { after } from "next/server";
import { prisma } from "./prisma";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

import { slugify } from "./utils";
import { AiError, cleanHtmlResponse, generateImage, generateText, toAiError } from "./ai/client";
import { analyzeArticle } from "./article-analyzer";
import { fetchPublicResource } from "./server/remote-fetch";

// Yardımcı: Belirli bir süre bekle (ms)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Üretilen kapak görselini Vercel Blob'a kaydeder. */
async function saveCoverImage(buffer: Buffer, mimeType: string) {
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
  const { url } = await put(`articles/ai-${Date.now()}.${ext}`, buffer, { access: "public", contentType: mimeType });
  return url;
}

/** Haber metni için ortak yazım çerçevesi */
const WRITER_FORMAT = `Çıktı kuralları:
- Yalnızca makale gövdesini HTML olarak döndür (h2, h3, p, strong, ul, li, blockquote). Başlık (h1), markdown veya kod bloğu kullanma.
- En az 500 kelime, kısa ve okunur paragraflar.
- Kaynak metni kopyalama; bilgiyi kendi cümlelerinle, tarafsız gazetecilik diliyle yaz.
- Doğrulanamayan bilgi uydurma.`;

/** Kapak görseli üret; başarısızsa RSS görselini sisteme aktar. */
async function produceCoverImage(imagePromptBase: string, title: string, rssImageUrl: string | null, useRssImageAsReference: boolean) {
  try {
    const prompt = `${imagePromptBase}\nHaber başlığı: "${title}"\nStil: Fotogerçekçi haber fotoğrafı, 16:9, üzerinde yazı veya logo yok.`;
    const image = await generateImage(prompt, { referenceImageUrl: useRssImageAsReference && rssImageUrl ? rssImageUrl : undefined });
    return await saveCoverImage(image.buffer, image.mimeType);
  } catch (error) {
    console.warn("[AI Writer] Kapak görseli üretilemedi:", toAiError(error).message);
  }
  if (!rssImageUrl) return null;
  try {
    const buffer = await fetchPublicResource(rssImageUrl, { maxBytes: 8 * 1024 * 1024 });
    return buffer.length > 0 ? await saveCoverImage(buffer, "image/jpeg") : rssImageUrl;
  } catch {
    return rssImageUrl;
  }
}

export async function writeArticleWithAI(suggestionId: string) {
  const processingToken = randomUUID();
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  let claimed = false;

  try {
    const existingArticle = await prisma.article.findUnique({
      where: { sourceRssItemId: suggestionId },
      select: { id: true, title: true },
    });

    if (existingArticle) {
      return {
        success: true,
        articleId: existingArticle.id,
        title: existingArticle.title,
        skipped: true,
      };
    }

    const claim = await prisma.rssFeedItem.updateMany({
      where: {
        id: suggestionId,
        usedForArticle: false,
        OR: [
          { processingAt: null },
          { processingAt: { lt: staleBefore } },
        ],
        status: { in: ["ANALYZED", "APPROVED"] },
      },
      data: {
        processingAt: new Date(),
        processingToken,
      },
    });

    if (claim.count !== 1) {
      throw new Error("Bu haber önerisi başka bir işlem tarafından işleniyor veya kullanıldı.");
    }
    claimed = true;

    const suggestion = await prisma.rssFeedItem.findUnique({
      where: { id: suggestionId },
      include: { source: true },
    });

    if (!suggestion) throw new Error("Öneri bulunamadı.");

    const settings = await prisma.systemSettings.findFirst();
    if (!settings) throw new Error("Sistem ayarları bulunamadı.");

    // ── Persona & Kategori Zekası ──
    const globalSystemPrompt = settings?.aiWriterPrompt || "Sen profesyonel bir haber yazarısın.";
    let systemPrompt = globalSystemPrompt;
    let imagePromptBase = settings?.aiWriterImagePrompt || "Professional news cover image.";
    let categoryId: string | null = null;
    let aiPersonaId: string | null = null;

    // Özellik bayrakları (Sadece global ayarlar)
    const useGoogleSearch = settings?.aiWriterSearchEnabled || false;
    const useRssImage = settings?.aiWriterUseRssImage !== false;

    const aiAnalysisObj = suggestion.aiAnalysis as Record<string, unknown> | null;
    if (aiAnalysisObj && typeof aiAnalysisObj.suggestedCategory === "string") {
      const suggestedCatName = aiAnalysisObj.suggestedCategory;

      // Önce tam eşleşme dene
      let category = await prisma.category.findUnique({
        where: { name: suggestedCatName },
      });

      // Bulunamazsa kısmi/insensitive dene
      if (!category) {
        category = await prisma.category.findFirst({
          where: { name: { contains: suggestedCatName, mode: 'insensitive' } },
        });
      }

      if (category) {
        categoryId = category.id;
        const personaLink = await prisma.aiPersonaOnCategory.findFirst({
          where: { categoryId: category.id, persona: { isActive: true } },
          orderBy: { lastUsedAt: 'asc' },
          include: { persona: true }
        });

        if (personaLink) {
          const persona = personaLink.persona;
          aiPersonaId = persona.id;
          systemPrompt = `${globalSystemPrompt}\n\nÖzel Yazım Talimatları:\n${persona.prompt}`;
          imagePromptBase = persona.imagePrompt;

          await prisma.aiPersonaOnCategory.update({
            where: { personaId_categoryId: { personaId: persona.id, categoryId: category.id } },
            data: { lastUsedAt: new Date() }
          });
        }
      }
    }

    // 2. Metin Üret (model, yedekler ve tekrar denemeler ortak AI katmanında)
    const suggestedTitles = Array.isArray(aiAnalysisObj?.suggestedTitles)
      ? (aiAnalysisObj.suggestedTitles as unknown[]).filter((t): t is string => typeof t === "string")
      : [];
    const textPrompt = `Konu: ${suggestion.title}
${suggestedTitles.length ? `Önerilen başlıklar: ${suggestedTitles.join(" | ")}\n` : ""}Kaynak özet: ${suggestion.excerpt || "(yok)"}
Kaynak: ${suggestion.source.name}${useGoogleSearch ? "\nKonuyu web/Google araması ile doğrula ve en güncel bilgileri kullan." : ""}`;

    const { text: rawContent, model: usedModel } = await generateText("writer", {
      system: `${systemPrompt}\n\n${WRITER_FORMAT}`,
      prompt: textPrompt,
      search: useGoogleSearch,
      temperature: 0.7,
    });
    const content = cleanHtmlResponse(rawContent);
    if (!content) throw new Error("Yapay zeka metin üretemedi.");
    console.log(`[AI Writer] Metin üretildi: ${usedModel}`);

    // 3. Kapak görseli
    const imageUrl = await produceCoverImage(imagePromptBase, suggestion.title, suggestion.imageUrl, useRssImage);

    // 4. Kaydet
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) throw new Error("Admin kullanıcı bulunamadı.");

    // Medya kütüphanesine ekle (AI üretimi veya aktarılan RSS görseli)
    if (imageUrl && imageUrl.includes("public.blob.vercel-storage.com")) {
      await prisma.media.create({
        data: {
          url: imageUrl,
          filename: imageUrl.split('/').pop() || `Cover_${Date.now()}.png`,
          size: 0,
          mimeType: "image/png",
          status: "RAW",
          userId: adminUser.id,
        }
      }).catch(e => console.error("Media kütüphanesine eklenemedi:", e));
    }

    // Analizde önerilen özgün başlık varsa onu kullan (kaynak başlığı birebir kopyalamamak için)
    const title = suggestedTitles[0]?.trim() || suggestion.title;
    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content,
        excerpt: suggestion.excerpt,
        coverImage: imageUrl,
        status: "PUBLISHED",
        authorId: adminUser.id,
        sourceRssItemId: suggestion.id,
        aiPersonaId,
        categoryId,
        publishedAt: new Date(),
        lang: suggestion.source.language || "tr",
      },
    });

    // Google Indexing API bildirimi ve Sosyal Medya Paylaşımı
    try {
      const { notifyGoogle, getArticleUrl } = await import("./google-indexing");
      after(() => notifyGoogle(getArticleUrl(article.slug), "URL_UPDATED").catch(err => console.error("Google Indexing Error:", err)));

      const { publishToTelegram } = await import("./social-publisher");
      after(() => publishToTelegram({ title: article.title, excerpt: article.excerpt, slug: article.slug, coverImage: article.coverImage }).catch(err => console.error("Telegram publish error:", err)));
    } catch (e) {
      console.error("Failed to load google-indexing or social-publisher helper in writeArticleWithAI:", e);
    }

    await prisma.rssFeedItem.updateMany({
      where: { id: suggestionId, processingToken },
      data: {
        usedForArticle: true,
        processingAt: null,
        processingToken: null,
      },
    });

    // Otomatik Analiz Tetikleme ve Yeniden Yazım (Rewrite) Kontrolü
    try {
      console.log(`[AI Writer] Yeni makale için otomatik analiz tetikleniyor...`);
      const analysis = await analyzeArticle(article.id);

      const PLAGIARISM_THRESHOLD = 30; // %30 intihal eşiği
      let currentPlagiarismRate = analysis.success ? (analysis.plagiarismRate ?? 0) : 0;

      if (analysis.success && currentPlagiarismRate > PLAGIARISM_THRESHOLD) {
        console.log(`[AI Writer] Otomatik analiz sonucu yüksek intihal oranı tespit edildi: %${currentPlagiarismRate}. Yeniden yazım başlatılıyor...`);

        let rewriteSuccess = false;
        let rewriteAttempt = 1;
        const maxRewriteAttempts = 2;

        while (rewriteAttempt <= maxRewriteAttempts && currentPlagiarismRate > PLAGIARISM_THRESHOLD) {
          console.log(`[AI Writer] Yeniden yazım denemesi ${rewriteAttempt}/${maxRewriteAttempts}...`);

          const rewritePrompt = `Daha önce yazdığın haber makalesinde yüksek anlamsal benzerlik (%${currentPlagiarismRate}) tespit edildi.
Aşağıdaki konuyu tamamen farklı cümle yapılarıyla, özgün ve tarafsız bir gazetecilik diliyle yeniden yaz. Klişe ve kopya ifadelerden kaçın.

${textPrompt}`;

          let newContent = "";
          try {
            const res = await generateText("writer", {
              system: `${systemPrompt}\n\n${WRITER_FORMAT}`,
              prompt: rewritePrompt,
              search: useGoogleSearch,
              temperature: 0.8,
            });
            newContent = cleanHtmlResponse(res.text);
          } catch (rewriteErr) {
            console.error(`[AI Writer] Yeniden yazım hatası:`, toAiError(rewriteErr).message);
          }

          if (newContent) {
            await prisma.article.update({
              where: { id: article.id },
              data: { content: newContent }
            });

            // Yeniden analiz et
            const reAnalysis = await analyzeArticle(article.id);
            if (reAnalysis.success) {
              currentPlagiarismRate = reAnalysis.plagiarismRate ?? 0;
              if (currentPlagiarismRate <= PLAGIARISM_THRESHOLD) {
                rewriteSuccess = true;
                console.log(`[AI Writer] Yeniden yazım başarılı! Yeni intihal oranı: %${currentPlagiarismRate}`);
                break;
              }
            }
          }
          rewriteAttempt++;
        }

        if (!rewriteSuccess) {
          console.warn(`[AI Writer] ${maxRewriteAttempts} yeniden yazma denemesine rağmen intihal oranı %${PLAGIARISM_THRESHOLD} altına düşürülemedi. Son oran: %${currentPlagiarismRate}`);
        }
      }
    } catch (analysisErr) {
      console.error("[AI Writer] Otomatik analiz veya yeniden yazım hatası:", analysisErr);
    }

    return { success: true, articleId: article.id, title: article.title };
  } catch (error) {
    const aiError = error instanceof AiError ? error : null;
    console.error("AI Writer Hatası:", aiError ? `${aiError.message} — ${aiError.raw}` : error);

    if (claimed) {
      await prisma.rssFeedItem.updateMany({
        where: { id: suggestionId, processingToken },
        data: { processingAt: null, processingToken: null },
      }).catch((releaseError) => {
        console.error("AI Writer claim release error:", releaseError);
      });
    }

    return {
      success: false,
      error: aiError
        ? `${aiError.message}${aiError.raw ? ` Ayrıntı: ${aiError.raw}` : ""}`
        : error instanceof Error ? error.message : "AI ile haber üretimi tamamlanamadı.",
    };
  }
}

export async function writeBatchArticlesWithAI(count: number = 3) {
  const safeCount = Number.isInteger(count) ? Math.min(Math.max(count, 1), 10) : 3;
  const suggestions = await prisma.rssFeedItem.findMany({
    where: {
      status: { in: ["ANALYZED", "APPROVED"] },
      dismissed: false,
      usedForArticle: false,
    },
    orderBy: { aiScore: "desc" },
    take: safeCount,
  });

  const results = [];
  for (let i = 0; i < suggestions.length; i++) {
    const result = await writeArticleWithAI(suggestions[i].id);
    results.push({ id: suggestions[i].id, ...result });
    if (i < suggestions.length - 1) await sleep(15000);
  }
  return results;
}

export async function rewriteArticleWithAI(articleId: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { aiPersona: true, category: true }
    });
    if (!article) throw new Error("Makale bulunamadı.");

    const settings = await prisma.systemSettings.findFirst();

    // Prompt hazırlığı
    const systemPrompt = settings?.aiWriterPrompt || "Sen profesyonel bir haber editörüsün.";
    let finalPrompt = systemPrompt;
    if (article.aiPersona) {
      finalPrompt = `${systemPrompt}\n\nÖzel Yazım Talimatları:\n${article.aiPersona.prompt}`;
    }

    console.log(`[AI Writer] Manuel yeniden yazım başlatılıyor: Makale="${article.title}" (${article.id})`);

    const { text } = await generateText("writer", {
      system: `${finalPrompt}\n\n${WRITER_FORMAT}`,
      prompt: `Aşağıdaki haberi tamamen özgün, akıcı ve yüksek kaliteli olacak şekilde yeniden yaz. Anlatım bozukluklarını düzelt, bilgileri koru.

Başlık: ${article.title}

Mevcut metin:
${article.content.slice(0, 20000)}`,
      search: settings?.aiWriterSearchEnabled ?? false,
      temperature: 0.7,
    });
    const content = cleanHtmlResponse(text);

    if (!content) throw new Error("Yeniden yazım başarısız oldu, içerik üretilemedi.");

    // Makaleyi güncelle
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: { content }
    });

    if (updatedArticle.status === "PUBLISHED") {
      try {
        const { notifyGoogle, getArticleUrl } = await import("./google-indexing");
        after(() => notifyGoogle(getArticleUrl(updatedArticle.slug), "URL_UPDATED").catch(err => console.error("Google Indexing Error:", err)));
      } catch (e) {
        console.error("Failed to load google-indexing helper in rewriteArticleWithAI:", e);
      }
    }

    // Tekrar analiz et
    const analysis = await analyzeArticle(articleId);

    return {
      success: true,
      analysis
    };
  } catch (error: unknown) {
    const errMsg = error instanceof AiError
      ? `${error.message}${error.raw ? ` Ayrıntı: ${error.raw}` : ""}`
      : error instanceof Error ? error.message : String(error);
    console.error("Manuel Yeniden Yazım Hatası:", errMsg);
    return { success: false, error: errMsg };
  }
}
