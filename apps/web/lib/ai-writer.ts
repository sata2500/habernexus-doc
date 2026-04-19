import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import { put } from "@vercel/blob";
import { slugify } from "./utils"; // Varsayalım slugify var, yoksa ekleriz

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Yardımcı: Belirli bir süre bekle (ms)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * AI Çağrılarını Retry (Tekrar Deneme) Mantığıyla Sarmalar
 */
async function callAiWithRetry(model: any, prompt: any, options: any = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (options.isImage) {
        return await model.generateContent(prompt);
      } else {
        return await model.generateContent(prompt);
      }
    } catch (error: any) {
      const isQuotaError = error.message?.includes("429") || error.message?.includes("Too Many Requests") || error.message?.includes("quota");
      if (isQuotaError && i < retries - 1) {
        console.warn(`[AI Retry] Kota hatası alındı. ${i + 1}. deneme başarısız. Bekleniyor...`);
        // Her denemede daha uzun bekle (Exponential Backoff)
        await sleep(Math.pow(2, i) * 1000 + 1000);
        continue;
      }
      throw error;
    }
  }
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
    const systemPrompt = settings?.aiWriterPrompt || "Profesyonel bir haber yaz.";
    const imagePromptBase = settings?.aiWriterImagePrompt || "Haber görseli.";
    const writerModelName = settings?.aiWriterModel || "gemini-2.5-flash";
    const imageModelName = settings?.aiWriterImageModel || "gemini-2.5-flash";

    // 2. Gemini Modelini Hazırla (Google Search Grounding ile)
    const model = genAI.getGenerativeModel({
      model: writerModelName,
      tools: [
        {
          // @ts-ignore - SDK tipleri henüz güncel olmayabilir
          googleSearch: {},
        },
      ],
    });

    // 3. İçeriği Oluştur (Araştır ve Yaz)
    const prompt = `
      Konu: ${suggestion.title}
      Kaynak Özet: ${suggestion.excerpt || ""}
      Sistem Talimatı: ${systemPrompt}
      
      Lütfen bu konuyu internetten araştır ve en az 500 kelimelik, SEO uyumlu, profesyonel bir haber makalesi yaz.
    `;

    const result = await callAiWithRetry(model, prompt);
    const response = await result.response;
    const content = response.text();

    // 4. Görsel Oluştur (Flash Image / Nano Banana)
    const imageModel = genAI.getGenerativeModel({ model: imageModelName });
    
    // Orijinal görseli ve başlığı bağlama ekle
    const imageGenPrompt = `
      ${imagePromptBase}
      Haber Başlığı: ${suggestion.title}
      ${suggestion.imageUrl ? `Kaynak Görsel Referansı: ${suggestion.imageUrl}` : ""}
      
      Lütfen bu haber için profesyonel, çarpıcı ve gerçekçi bir kapak fotoğrafı oluştur.
    `;
    
    let imageUrl = suggestion.imageUrl;

    try {
      // 1. Önce yeni 'generateImages' endpoint'ini dene (Nano Banana için standart)
      const generateImagesUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageModelName}:generateImages?key=${process.env.GEMINI_API_KEY}`;
      
      let imageFetchRes = await fetch(generateImagesUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imageGenPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
          },
        }),
      });

      // Eğer 404/405 verirse (belki bu model hala generateContent istiyordur), fallback yap
      if (!imageFetchRes.ok && (imageFetchRes.status === 404 || imageFetchRes.status === 405)) {
        console.warn(`[AI Writer] ${imageModelName} için generateImages desteklenmiyor, generateContent deneniyor...`);
        const generateContentUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageModelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        imageFetchRes = await fetch(generateContentUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: imageGenPrompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
        });
      }

      if (!imageFetchRes.ok) {
        const errorData = await imageFetchRes.json();
        throw new Error(`Görsel API Hatası: ${JSON.stringify(errorData)}`);
      }

      const imageResultData = await imageFetchRes.json();
      let base64Data: string | null = null;

      // generateImages Yanıtı
      if (imageResultData.generatedImages?.[0]?.image?.imageBytes) {
        base64Data = imageResultData.generatedImages[0].image.imageBytes;
      } 
      // generateContent Yanıtı (Fallback)
      else if (imageResultData.candidates?.[0]?.content?.parts) {
        const part = imageResultData.candidates[0].content.parts.find((p: any) => p.inlineData);
        if (part?.inlineData?.data) {
          base64Data = part.inlineData.data;
        }
      }

      if (base64Data) {
        const buffer = Buffer.from(base64Data, "base64");
        const { url } = await put(`articles/ai-${Date.now()}.png`, buffer, {
          access: "public",
          contentType: "image/png",
        });
        imageUrl = url;
        console.log("[AI Writer] Görsel başarıyla üretildi:", imageUrl);
      } else {
        console.warn("[AI Writer] Modelden geçerli bir görsel verisi alınamadı.");
      }
    } catch (imageErr) {
      console.error("Görsel üretilirken hata oluştu (Orijinal görsel kullanılacak):", imageErr);
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
  // En yüksek puanlı, henüz kullanılmamış önerileri getir
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
  for (const suggestion of suggestions) {
    const result = await writeArticleWithAI(suggestion.id);
    results.push({ id: suggestion.id, ...result });
    
    // Ücretsiz katman RPM limitlerine takılmamak için her haber arasında bekle
    if (suggestions.indexOf(suggestion) < suggestions.length - 1) {
      await sleep(5000); 
    }
  }

  return results;
}
