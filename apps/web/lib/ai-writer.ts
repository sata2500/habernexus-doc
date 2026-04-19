import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";
import { put } from "@vercel/blob";
import { slugify } from "./utils";

// Metin üretimi için eski SDK (Google Search grounding destekli)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Görsel üretimi için yeni SDK (Nano Banana - resmi dokümantasyon)
const genAINew = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Yardımcı: Belirli bir süre bekle (ms)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Resmi Google AI Nano Banana API'si kullanarak görsel üretir.
 * Kaynak: https://ai.google.dev/gemini-api/docs/image-generation (JavaScript)
 */
async function generateImageWithNanoBanana(
  modelName: string,
  prompt: string,
  retries = 3
): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[AI Writer] Görsel üretimi deneniyor: model=${modelName}, deneme=${i + 1}`);

      const response = await genAINew.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      // Yanıt içindeki görsel parçasını bul (resmi dökümantasyondaki pattern)
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          const { url } = await put(`articles/ai-${Date.now()}.png`, buffer, {
            access: "public",
            contentType: part.inlineData.mimeType || "image/png",
          });
          console.log("[AI Writer] Görsel başarıyla üretildi:", url);
          return url;
        }
      }

      console.warn("[AI Writer] Model görsel içeren bir yanıt döndürmedi.");
      return null;
    } catch (error: any) {
      const isQuota = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("Too Many Requests");
      if (isQuota && i < retries - 1) {
        const waitMs = Math.pow(2, i) * 2000;
        console.warn(`[AI Writer] Kota hatası, ${waitMs}ms bekleniyor...`);
        await sleep(waitMs);
        continue;
      }
      console.error(`[AI Writer] Görsel üretim hatası:`, error.message);
      return null;
    }
  }
  return null;
}

export async function writeArticleWithAI(suggestionId: string) {
  try {
    // 1. Öneriyi ve ayarları getir
    const suggestion = await prisma.rssFeedItem.findUnique({
      where: { id: suggestionId },
      include: { source: true },
    });

    if (!suggestion) throw new Error("Öneri bulunamadı.");

    const settings = await prisma.systemSettings.findFirst();
    const systemPrompt = settings?.aiWriterPrompt || "Sen profesyonel bir haber yazarısın. Haberleri Türkçe, akıcı, SEO uyumlu ve en az 500 kelimelik yaz.";
    const imagePromptBase = settings?.aiWriterImagePrompt || "Professional, photorealistic news cover image.";
    const writerModelName = settings?.aiWriterModel || "gemini-2.5-flash";
    const imageModelName = settings?.aiWriterImageModel || "gemini-2.5-flash-image";

    // 2. Metin Modeli - Google Search Grounding ile (eski SDK)
    const model = genAI.getGenerativeModel({
      model: writerModelName,
      tools: [
        {
          // @ts-ignore - SDK tipleri henüz güncel olmayabilir
          googleSearch: {},
        },
      ],
    });

    // 3. İçeriği Oluştur
    const textPrompt = `
      Konu: ${suggestion.title}
      Kaynak Özet: ${suggestion.excerpt || ""}
      
      ${systemPrompt}
      
      Lütfen bu konuyu Google'da araştır ve en az 500 kelimelik, SEO uyumlu, HTML formatında profesyonel bir haber makalesi yaz.
      Makaleyi h2, p, strong etiketleri kullanarak formatla.
    `;

    const result = await model.generateContent(textPrompt);
    const response = await result.response;
    const content = response.text();

    // 4. Görsel Üret - Nano Banana (yeni SDK)
    const imagePrompt = `
      ${imagePromptBase}
      
      News headline: "${suggestion.title}"
      
      Create a professional, high-quality, photorealistic news cover image for this article.
      Style: Editorial photography, dramatic lighting, 16:9 aspect ratio.
      Do NOT include any text or watermarks in the image.
    `;

    let imageUrl: string | null | undefined = suggestion.imageUrl;
    const generatedImageUrl = await generateImageWithNanoBanana(imageModelName, imagePrompt);
    if (generatedImageUrl) {
      imageUrl = generatedImageUrl;
    }

    // 5. Makaleyi Kaydet
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) throw new Error("Admin kullanıcı bulunamadı.");

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
        publishedAt: new Date(),
        lang: "tr",
      },
    });

    // 6. Öneriyi "Kullanıldı" olarak işaretle
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

/**
 * Belirtilen sayıda en yüksek puanlı haberi otomatik olarak yazar.
 */
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
    const suggestion = suggestions[i];
    const result = await writeArticleWithAI(suggestion.id);
    results.push({ id: suggestion.id, ...result });

    // Kota limitlerini aşmamak için her haber arasında bekle
    if (i < suggestions.length - 1) {
      await sleep(5000);
    }
  }

  return results;
}
