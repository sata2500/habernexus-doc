import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";
import { put } from "@vercel/blob";
import { slugify } from "./utils";

// TEK KÜTÜPHANE: @google/genai (Nisan 2026 standardı)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Yardımcı: Belirli bir süre bekle (ms)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Resmi @google/genai SDK ile görsel üretir (AI Studio'da Imagen Requests olarak görünür).
 */
async function generateImageWithImagen(
  modelName: string,
  prompt: string,
  retries = 3
): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[AI Writer] Görsel üretimi deneniyor: model=${modelName}, deneme=${i + 1}`);

      const response = await ai.models.generateImages({
        model: modelName,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/png",
        },
      });

      const image = response.generatedImages?.[0];
      if (image?.image?.imageBytes) {
        const buffer = Buffer.from(image.image.imageBytes, "base64");
        const { url } = await put(`articles/ai-${Date.now()}.png`, buffer, {
          access: "public",
          contentType: "image/png",
        });
        console.log("[AI Writer] Görsel başarıyla üretildi:", url);
        return url;
      }

      console.warn("[AI Writer] Model görsel döndürmedi.");
      return null;
    } catch (error: any) {
      const isQuota = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("Too Many Requests");
      if (isQuota && i < retries - 1) {
        // Kota hatalarında (Too Many Requests) daha uzun bekleme (Exponential Backoff)
        const waitMs = Math.pow(2, i + 1) * 5000; // 10s, 20s, 40s...
        console.warn(`[AI Writer] Kota hatası, Imagen limitlerine takıldı. ${waitMs}ms bekleniyor...`);
        await sleep(waitMs);
        continue;
      }
      console.error(`[AI Writer] Görsel üretim hatası:`, error.message);
      return null; // Görsel hatası makaleyi patlatmasın
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
    const imageModelName = settings?.aiWriterImageModel || "imagen-3.0-generate-002"; // Varsayılan Imagen Modeli

    // 2. Metin Üret - @google/genai ile (Google Search Grounding dahil)
    const textPrompt = `
      Konu: ${suggestion.title}
      Kaynak Özet: ${suggestion.excerpt || ""}
      
      ${systemPrompt}
      
      Lütfen bu konuyu Google'da araştır ve en az 500 kelimelik, SEO uyumlu, HTML formatında profesyonel bir haber makalesi yaz.
      Makaleyi h2, p, strong etiketleri kullanarak formatla.
    `;

    // Retries for Text Generation
    let content = "";
    for (let i = 0; i < 3; i++) {
      try {
        const textResponse = await ai.models.generateContent({
          model: writerModelName,
          contents: textPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        content = textResponse.text || "";
        break;
      } catch (err: any) {
        if (err.message?.includes("429") && i < 2) {
          console.warn("[AI Writer] Metin üretiminde 429 hatası, 5sn bekleniyor...");
          await sleep(5000);
          continue;
        }
        throw err;
      }
    }

    if (!content) throw new Error("Yapay zeka metin üretemedi.");

    // 3. Görsel Üret - @google/genai generateImages ile
    const imagePrompt = `
      ${imagePromptBase}
      News headline: "${suggestion.title}"
      Create a professional, high-quality, photorealistic news cover image for this article.
      Style: Editorial photography, dramatic lighting, 16:9 aspect ratio.
      Do NOT include any text or watermarks in the image.
    `;

    let imageUrl: string | null | undefined = suggestion.imageUrl;
    const generatedImageUrl = await generateImageWithImagen(imageModelName, imagePrompt);
    if (generatedImageUrl) {
      imageUrl = generatedImageUrl;
    }

    // 4. Makaleyi Kaydet
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

    // 5. Öneriyi "Kullanıldı" olarak işaretle
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

    // Kota limitlerini (429 Too Many Requests) aşmamak için her haber arasında 15 SANİYE bekle
    // Not: Görsel (Imagen) limitleri çok daha katı olabilir.
    if (i < suggestions.length - 1) {
      console.log(`[AI Writer Batch] ${i + 1}. haber bitti. 15 saniye bekleniyor...`);
      await sleep(15000);
    }
  }

  return results;
}
