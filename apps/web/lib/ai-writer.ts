import { prisma } from "./prisma";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

import { slugify } from "./utils";
import { analyzeArticle } from "./article-analyzer";
import { fetchPublicResource } from "./server/remote-fetch";

// Yardımcı: Belirli bir süre bekle (ms)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function decodeDataImage(value: string) {
  const match = value.match(/^data:image\/[a-z0-9.+-]+;base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new Error("Unsupported image data URL.");

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0 || buffer.length > 8 * 1024 * 1024) {
    throw new Error("Generated image exceeds the maximum allowed size.");
  }
  return buffer;
}

// Yardımcı: URL'den görseli indirip base64'e çevirir (Vision analizi için)

export async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const buffer = await fetchPublicResource(url, { maxBytes: 8 * 1024 * 1024 });
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

/**
 * Google GenAI API kullanarak içerik üretir.
 */
async function generateContentWithGoogleGenAI(model: string, prompt: string, useGoogleSearch: boolean): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY eksik.");

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const tools = useGoogleSearch ? [{ googleSearch: {} }] : undefined;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      tools: tools,
    }
  });

  return response.text || "";
}

/**
 * Google GenAI API kullanarak görsel üretir.
 */
async function generateImageWithGoogleGenAI(model: string, prompt: string): Promise<string | null> {
  try {
    console.log(`[AI Writer] Google GenAI görsel üretimi: model=${model}`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY eksik.");

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "16:9",
      }
    });

    const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64Image) {
      console.log("[AI Writer] Google GenAI görseli Blob'a aktarılıyor...");
      const buffer = Buffer.from(base64Image, 'base64');
      const { url: blobUrl } = await put(`articles/ai-gg-${Date.now()}.jpg`, buffer, {
        access: "public",
        contentType: "image/jpeg",
      });
      return blobUrl;
    }
    return null;
  } catch (err) {
    console.error("Google GenAI Image Generation Hatası:", err);
    return null;
  }
}

/**
 * OpenRouter API kullanarak içerik üretir.
 */
async function generateContentWithOpenRouter(model: string, messages: Array<{ role: string; content: string | unknown[] }>, tools?: unknown[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY eksik.");

  const body: Record<string, unknown> = {
    model: model,
    messages: messages,
    response_format: { type: "text" }
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com",
      "X-Title": "Haber Nexus",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenRouter Hatası: ${data.error?.message || response.statusText}`);
  }
  return data.choices?.[0]?.message?.content || "";
}

/**
 * OpenRouter API kullanarak görsel üretir.
 */
async function generateImageWithOpenRouter(model: string, prompt: string, referenceImageUrl?: string): Promise<string | null> {
  try {
    console.log(`[AI Writer] OpenRouter görsel üretimi: model=${model}, referans=${!!referenceImageUrl}`);
    const apiKey = process.env.OPENROUTER_API_KEY || "";

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ type: "text", text: prompt }];
    if (referenceImageUrl) {
      content.push({ type: "image_url", image_url: { url: referenceImageUrl } });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: content }],
        modalities: ["image"]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "OpenRouter Image Error");

    const imageContent = data.choices?.[0]?.message?.content;
    if (imageContent && (imageContent.startsWith("http") || imageContent.startsWith("data:image"))) {
      // Görseli indir ve Vercel Blob'a kaydet (Kalıcılık ve Optimizasyon için)
      console.log("[AI Writer] OpenRouter görseli Blob'a aktarılıyor...");
      const buffer = imageContent.startsWith("data:image/")
        ? decodeDataImage(imageContent)
        : await fetchPublicResource(imageContent, { maxBytes: 8 * 1024 * 1024 });
      const { url: blobUrl } = await put(`articles/ai-or-${Date.now()}.png`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      return blobUrl;
    }
    return null;
  } catch (err) {
    console.error("OpenRouter Image Generation Hatası:", err);
    return null;
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

    const isGoogle = settings.aiProvider === "GOOGLE";

    if (isGoogle && !process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY yapılandırılmamış.");
    if (!isGoogle && !process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY yapılandırılmamış.");

    const writerModelName = settings?.aiWriterModel || "gemini-2.5-flash";
    const imageModelName = settings?.aiWriterImageModel || "imagen-3.0-generate-002";

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

    // 2. Metin Üret
    const textPrompt = `
      Konu: ${suggestion.title}
      Kaynak Özet: ${suggestion.excerpt || ""}
      Talimat: ${systemPrompt}
      Format: HTML (h2, p, strong). En az 500 kelime.
    `;

    // Google Arama Tool'u hazırla
    const tools = useGoogleSearch ? [{ type: "openrouter:web_search" }] : undefined;

    let content = "";
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`[AI Writer] Metin üretiliyor: Model=${writerModelName}, Deneme=${i + 1}, Arama=${useGoogleSearch}, Provider=${settings.aiProvider}`);
        
        if (isGoogle) {
          content = await generateContentWithGoogleGenAI(writerModelName, textPrompt, useGoogleSearch);
        } else {
          content = await generateContentWithOpenRouter(writerModelName, [{ role: "user", content: textPrompt }], tools);
        }
        break;
      } catch (err: unknown) {
        const errorMsg = String(err);
        const isRetryable = errorMsg.includes("429") || errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("high demand") || errorMsg.includes("timeout");
        if (isRetryable && i < 2) {
          await sleep(errorMsg.includes("503") ? 10000 : 5000);
          continue;
        }
        throw err;
      }
    }

    if (!content) throw new Error("Yapay zeka metin üretemedi.");

    // 3. Görsel Üret
    const finalImagePrompt = `${imagePromptBase}\nNews headline: "${suggestion.title}"\nStyle: Photorealistic, 16:9, no text.`;
    const referenceUrl = useRssImage && suggestion.imageUrl ? suggestion.imageUrl : undefined;

    let generatedImageUrl = null;
    
    if (isGoogle) {
      generatedImageUrl = await generateImageWithGoogleGenAI(imageModelName, finalImagePrompt);
    } else {
      generatedImageUrl = await generateImageWithOpenRouter(imageModelName, finalImagePrompt, referenceUrl);
    }
    
    let imageUrl = generatedImageUrl;

    // Eğer AI görsel üretmediyse veya hata oluştuysa RSS görselini kullan ve sisteme kaydet
    if (!imageUrl && suggestion.imageUrl) {
      try {
        console.log("[AI Writer] Orijinal RSS görseli sisteme aktarılıyor...");
        const buffer = await fetchPublicResource(suggestion.imageUrl, { maxBytes: 8 * 1024 * 1024 });
        if (buffer.length > 0) {
          const { url: blobUrl } = await put(`articles/rss-${Date.now()}.png`, buffer, {
            access: "public",
            contentType: "image/png",
          });
          imageUrl = blobUrl;
        }
      } catch (e) {
        console.warn("[AI Writer] RSS görseli aktarılamadı, orijinal URL kullanılacak:", e);
        imageUrl = suggestion.imageUrl;
      }
    }

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

    const title = suggestion.title;
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
      notifyGoogle(getArticleUrl(article.slug), "URL_UPDATED").catch(err => console.error("Google Indexing Error:", err));

      const { publishToTelegram } = await import("./social-publisher");
      publishToTelegram({ title: article.title, excerpt: article.excerpt, slug: article.slug, coverImage: article.coverImage }).catch(err => console.error("Telegram publish error:", err));
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

          const rewritePrompt = `
            Daha önce yazdığın haber makalesinde yüksek oranda anlamsal benzerlik/intihal (%${currentPlagiarismRate}) tespit edildi.
            Lütfen aşağıdaki konuyu tamamen farklı cümle yapılarıyla, son derece özgün, zengin ve tarafsız bir gazetecilik diliyle yeniden yaz.
            Benzerlik taşıyan klişe kalıplardan ve doğrudan kopya cümlelerden kaçın.

            Konu: ${suggestion.title}
            Kaynak Özet: ${suggestion.excerpt || ""}
            Talimat: ${systemPrompt}
            Format: HTML (h2, p, strong). En az 500 kelime.
          `;

          let newContent = "";
          try {
            newContent = await generateContentWithOpenRouter(writerModelName, [{ role: "user", content: rewritePrompt }], tools);
          } catch (rewriteErr) {
            console.error(`[AI Writer] Yeniden yazım API hatası:`, rewriteErr);
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
    console.error("AI Writer Hatası:", error);

    if (claimed) {
      await prisma.rssFeedItem.updateMany({
        where: { id: suggestionId, processingToken },
        data: { processingAt: null, processingToken: null },
      }).catch((releaseError) => {
        console.error("AI Writer claim release error:", releaseError);
      });
    }

    return { success: false, error: "AI ile haber üretimi tamamlanamadı." };
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
    const writerModelName = settings?.aiWriterModel || "google/gemini-2.0-flash-001";

    // Prompt hazırlığı
    const systemPrompt = settings?.aiWriterPrompt || "Sen profesyonel bir haber editörüsün.";
    let finalPrompt = systemPrompt;
    if (article.aiPersona) {
      finalPrompt = `${systemPrompt}\n\nÖzel Yazım Talimatları:\n${article.aiPersona.prompt}`;
    }

    const useGoogleSearch = settings?.aiWriterSearchEnabled || false;
    const tools = useGoogleSearch ? [{ type: "openrouter:web_search" }] : undefined;

    const textPrompt = `
      Konu: ${article.title}
      Talimat: ${finalPrompt}
      Lütfen bu makaleyi tamamen özgün, akıcı ve yüksek kaliteli olacak şekilde yeniden yaz.
      Önceki versiyondaki anlatım bozukluklarını düzelt, intihal riski oluşturabilecek ifadelerden kaçın.
      Format: HTML (h2, p, strong). En az 500 kelime.
    `;

    console.log(`[AI Writer] Manuel yeniden yazım başlatılıyor: Makale="${article.title}" (${article.id})`);

    let content = "";
    for (let i = 0; i < 3; i++) {
      try {
        content = await generateContentWithOpenRouter(writerModelName, [{ role: "user", content: textPrompt }], tools);
        break;
      } catch (_err: unknown) {
        if (i < 2) {
          await sleep(5000);
          continue;
        }
        throw _err;
      }
    }

    if (!content) throw new Error("Yeniden yazım başarısız oldu, içerik üretilemedi.");

    // Makaleyi güncelle
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: { content }
    });

    if (updatedArticle.status === "PUBLISHED") {
      try {
        const { notifyGoogle, getArticleUrl } = await import("./google-indexing");
        notifyGoogle(getArticleUrl(updatedArticle.slug), "URL_UPDATED").catch(err => console.error("Google Indexing Error:", err));
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
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Manuel Yeniden Yazım Hatası:", error);
    return { success: false, error: errMsg };
  }
}
