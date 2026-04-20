import { GoogleGenAI } from "@google/genai";
import { prisma } from "./prisma";
import { put } from "@vercel/blob";
import { slugify } from "./utils";

// TEK KÜTÜPHANE: @google/genai (Nisan 2026 standardı)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Yardımcı: Belirli bir süre bekle (ms)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Yardımcı: URL'den görseli indirip base64'e çevirir (Gemini analizi için)
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
 * Resmi @google/genai SDK ile görsel üretir (Tier 1+ Ücretli Hesaplar için).
 */
async function generateImageWithImagen(
  modelName: string,
  prompt: string,
  retries = 3
): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[AI Writer] Görsel üretimi deneniyor (Premium): model=${modelName}, deneme=${i + 1}`);

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
        console.log("[AI Writer] Görsel başarıyla üretildi (Premium):", url);
        return url;
      }

      console.warn("[AI Writer] Model görsel döndürmedi.");
      return null;
    } catch (error: any) {
      const isQuota = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("Too Many Requests");
      if (isQuota && i < retries - 1) {
        const waitMs = Math.pow(2, i + 1) * 5000;
        console.warn(`[AI Writer] Kota hatası, Imagen limitlerine takıldı. ${waitMs}ms bekleniyor...`);
        await sleep(waitMs);
        continue;
      }
      console.error(`[AI Writer] Görsel üretim hatası:`, error.message);
      return null;
    }
  }
  return null;
}

/**
 * Pollinations.ai kullanarak tamamen ücretsiz görsel üretir.
 * Kredi kartı veya API Key gerektirmez. Kotalara takılmaz.
 */
async function generateImageWithPollinations(
  modelName: string,
  prompt: string,
  retries = 3
): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[AI Writer] Görsel üretimi deneniyor (Pollinations): model=${modelName}, deneme=${i + 1}`);
      
      const seed = Math.floor(Math.random() * 1000000);
      const encodedPrompt = encodeURIComponent(prompt);
      // modelName parametresi "flux", "turbo" veya "default" olabilir
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}&model=${modelName === 'default' ? '' : modelName}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Pollinations API hatası: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      const { url: blobUrl } = await put(`articles/ai-${Date.now()}.png`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      
      console.log("[AI Writer] Görsel başarıyla üretildi (Pollinations):", blobUrl);
      return blobUrl;

    } catch (error: any) {
      console.warn(`[AI Writer] Görsel üretim hatası, 3 saniye bekleniyor... (${error.message})`);
      if (i < retries - 1) {
        await sleep(3000);
        continue;
      }
      console.error(`[AI Writer] Pollinations görsel üretimi tamamen başarısız oldu:`, error.message);
      return null; // Görsel hatası makaleyi patlatmasın
    }
  }
  return null;
}

/**
 * OpenRouter API kullanarak içerik üretir (Claude, GPT, Llama vb. desteği için).
 */
async function generateContentWithOpenRouter(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY eksik.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com",
      "X-Title": "Haber Nexus",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenRouter Hatası: ${data.error?.message || response.statusText}`);
  }
  return data.choices?.[0]?.message?.content || "";
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
    const writerModelName = settings?.aiWriterModel || "gemini-2.5-flash";
    const imageModelName = settings?.aiWriterImageModel || "imagen-3.0-generate-002";

    // ── Persona & Kategori Zekası (Gelişmiş Rotasyon) ──
    const globalSystemPrompt = settings?.aiWriterPrompt || "Sen profesyonel bir haber yazarısın. Haberleri Türkçe, akıcı, SEO uyumlu ve en az 500 kelimelik yaz.";
    let systemPrompt = globalSystemPrompt;
    let imagePromptBase = settings?.aiWriterImagePrompt || "Professional, photorealistic news cover image.";
    let categoryId: string | null = null;
    let aiPersonaId: string | null = null;
    let personaModelName: string | null = null;

    if (suggestion.aiAnalysis && (suggestion.aiAnalysis as any).suggestedCategory) {
      const suggestedCatName = (suggestion.aiAnalysis as any).suggestedCategory;
      
      // Kategoriyi bul
      const category = await prisma.category.findFirst({
        where: { name: { contains: suggestedCatName, mode: 'insensitive' } },
      });

      if (category) {
        categoryId = category.id;
        console.log(`[AI Writer] Kategori tespit edildi: ${category.name}`);
        
        // Bu kategoriye atanmış aktif personaları bul (en eski kullanılan ilk sırada)
        const personaLink = await prisma.aiPersonaOnCategory.findFirst({
          where: { 
            categoryId: category.id,
            persona: { isActive: true }
          },
          orderBy: { lastUsedAt: 'asc' },
          include: { persona: true }
        });

        if (personaLink) {
          const persona = personaLink.persona;
          aiPersonaId = persona.id;
          personaModelName = persona.modelName;
          
          // TALİMAT: Genel prompt + Persona promptu birleştir
          systemPrompt = `${globalSystemPrompt}\n\nÖzel Yazım Talimatları (Bu kimlikle yaz):\n${persona.prompt}`;
          imagePromptBase = persona.imagePrompt;
          
          console.log(`[AI Writer] Persona seçildi (Rotasyon): ${persona.name}${personaModelName ? ` [Model: ${personaModelName}]` : ''}`);
          
          // Rotasyon zamanını güncelle
          await prisma.aiPersonaOnCategory.update({
            where: { personaId_categoryId: { personaId: persona.id, categoryId: category.id } },
            data: { lastUsedAt: new Date() }
          });
        }
      }
    }

    // 2. Metin Üret - @google/genai ile (Google Search Grounding dahil)
    const textPrompt = `
      Konu: ${suggestion.title}
      Kaynak Özet: ${suggestion.excerpt || ""}
      
      ${systemPrompt}
      
      Lütfen bu konuyu Google'da araştır ve en az 500 kelimelik, SEO uyumlu, HTML formatında profesyonel bir haber makalesi yaz.
      Makaleyi h2, p, strong etiketleri kullanarak formatla.
    `;

    // ... (Metin üretim kısmı aynı kalıyor)
    let content = "";
    const effectiveModel = personaModelName || writerModelName;
    const provider = settings?.aiProvider || "GOOGLE";

    for (let i = 0; i < 3; i++) {
      try {
        console.log(`[AI Writer] Metin üretiliyor: Provider=${provider}, Model=${effectiveModel}, Deneme=${i + 1}`);
        
        if (provider === "OPENROUTER") {
          content = await generateContentWithOpenRouter(effectiveModel, textPrompt);
        } else {
          const textResponse = await ai.models.generateContent({
            model: effectiveModel,
            contents: textPrompt,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });
          content = textResponse.text || "";
        }
        break;
      } catch (err: any) {
        const errorMsg = String(err);
        const isRetryable = errorMsg.includes("429") || errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("high demand") || errorMsg.includes("timeout");
        
        if (isRetryable && i < 2) {
          const waitMs = (errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE")) ? 10000 : 5000;
          console.warn(`[AI Writer] Metin üretiminde geçici hata, ${waitMs / 1000}sn bekleniyor...`);
          await sleep(waitMs);
          continue;
        }
        throw err;
      }
    }

    if (!content) throw new Error("Yapay zeka metin üretemedi.");

    // 3. Görsel Üret
    let imagePrompt = `
      ${imagePromptBase}
      News headline: "${suggestion.title}"
      Create a professional, high-quality, photorealistic news cover image for this article.
      Style: Editorial photography, dramatic lighting, 16:9 aspect ratio.
      Do NOT include any text or watermarks in the image.
    `;

    // ... (Görsel üretim kısmı aynı kalıyor)
    if (suggestion.imageUrl && settings?.aiWriterUseRssImage !== false) {
      const base64Image = await fetchImageAsBase64(suggestion.imageUrl);
      if (base64Image) {
        try {
          console.log("[AI Writer] Orijinal görsel analiz ediliyor (İlham alma)...");
          const visionResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              "Describe this image in extreme detail in English. I will use your description as a prompt to generate a highly realistic and professional editorial photograph. Focus on the main subjects, colors, lighting, action, and mood. Make it sound like a prompt for Midjourney. Do NOT include any text or watermarks.",
              {
                inlineData: {
                  data: base64Image,
                  mimeType: "image/jpeg",
                },
              },
            ],
          });

          if (visionResponse.text) {
            imagePrompt = visionResponse.text + " -- 16:9 aspect ratio, photorealistic high quality news photography, no text, no watermarks.";
            console.log("[AI Writer] Görselden ilham alınan yeni prompt oluşturuldu!");
          }
        } catch (e: any) {
          console.warn("[AI Writer] Görselden ilham alma başarısız oldu, varsayılan prompt kullanılacak:", e.message);
        }
      }
    }

    let imageUrl: string | null | undefined = suggestion.imageUrl;
    let generatedImageUrl = null;
    
    if (imageModelName.includes("gemini") || imageModelName.includes("imagen")) {
      generatedImageUrl = await generateImageWithImagen(imageModelName, imagePrompt);
    } else {
      generatedImageUrl = await generateImageWithPollinations(imageModelName, imagePrompt);
    }

    if (generatedImageUrl) {
      imageUrl = generatedImageUrl;
    }

    // 4. Makaleyi ve Medyayı Kaydet
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) throw new Error("Admin kullanıcı bulunamadı.");

    if (generatedImageUrl) {
      await prisma.media.create({
        data: {
          url: generatedImageUrl,
          filename: `AI_Cover_${Date.now()}.png`,
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
        aiPersonaId: aiPersonaId, // Personayı bağla
        categoryId: categoryId,
        publishedAt: new Date(),
        lang: suggestion.source.language || "tr",
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
