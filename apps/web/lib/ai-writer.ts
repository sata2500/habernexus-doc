import { prisma } from "./prisma";
import { put } from "@vercel/blob";
import { slugify } from "./utils";

// Yardımcı: Belirli bir süre bekle (ms)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Yardımcı: URL'den görseli indirip base64'e çevirir (Vision analizi için)
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (e) {
    return null;
  }
}

/**
 * OpenRouter API kullanarak içerik üretir.
 */
async function generateContentWithOpenRouter(model: string, messages: any[], tools?: any[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY eksik.");

  const body: any = {
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
    
    const content: any[] = [{ type: "text", text: prompt }];
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
      const res = await fetch(imageContent);
      const buffer = Buffer.from(await res.arrayBuffer());
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
  try {
    const suggestion = await prisma.rssFeedItem.findUnique({
      where: { id: suggestionId },
      include: { source: true },
    });

    if (!suggestion) throw new Error("Öneri bulunamadı.");

    const settings = await prisma.systemSettings.findFirst();
    const writerModelName = settings?.aiWriterModel || "google/gemini-2.0-flash-001";
    const imageModelName = settings?.aiWriterImageModel || "openai/dall-e-3";

    // ── Persona & Kategori Zekası ──
    const globalSystemPrompt = settings?.aiWriterPrompt || "Sen profesyonel bir haber yazarısın.";
    let systemPrompt = globalSystemPrompt;
    let imagePromptBase = settings?.aiWriterImagePrompt || "Professional news cover image.";
    let categoryId: string | null = null;
    let aiPersonaId: string | null = null;
    
    // Özellik bayrakları (Sadece global ayarlar)
    const useGoogleSearch = settings?.aiWriterSearchEnabled || false;
    const useRssImage = settings?.aiWriterUseRssImage !== false;

    if (suggestion.aiAnalysis && (suggestion.aiAnalysis as any).suggestedCategory) {
      const suggestedCatName = (suggestion.aiAnalysis as any).suggestedCategory;
      
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
        console.log(`[AI Writer] Metin üretiliyor: Model=${writerModelName}, Deneme=${i + 1}, Arama=${useGoogleSearch}`);
        content = await generateContentWithOpenRouter(writerModelName, [{ role: "user", content: textPrompt }], tools);
        break;
      } catch (err: any) {
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

    let generatedImageUrl = await generateImageWithOpenRouter(imageModelName, finalImagePrompt, referenceUrl);
    let imageUrl = generatedImageUrl;

    // Eğer AI görsel üretmediyse veya hata oluştuysa RSS görselini kullan ve sisteme kaydet
    if (!imageUrl && suggestion.imageUrl) {
      try {
        console.log("[AI Writer] Orijinal RSS görseli sisteme aktarılıyor...");
        const res = await fetch(suggestion.imageUrl);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
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
        aiPersonaId,
        categoryId,
        publishedAt: new Date(),
        lang: suggestion.source.language || "tr",
      },
    });

    await prisma.rssFeedItem.update({
      where: { id: suggestionId },
      data: { usedForArticle: true },
    });

    return { success: true, articleId: article.id, title: article.title };
  } catch (error) {
    console.error("AI Writer Hatası:", error);
    return { success: false, error: String(error) };
  }
}

export async function writeBatchArticlesWithAI(count: number = 3) {
  const suggestions = await prisma.rssFeedItem.findMany({
    where: {
      status: { in: ["ANALYZED", "APPROVED"] },
      dismissed: false,
      usedForArticle: false,
    },
    orderBy: { aiScore: "desc" },
    take: count,
  });

  const results = [];
  for (let i = 0; i < suggestions.length; i++) {
    const result = await writeArticleWithAI(suggestions[i].id);
    results.push({ id: suggestions[i].id, ...result });
    if (i < suggestions.length - 1) await sleep(15000);
  }
  return results;
}
