import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import { put } from "@vercel/blob";
import { slugify } from "./utils"; // Varsayalım slugify var, yoksa ekleriz

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    // 4. Görsel Oluştur
    const imageModel = genAI.getGenerativeModel({ model: imageModelName });
    const imageGenPrompt = `${imagePromptBase} Haber Başlığı: ${suggestion.title}`;
    
    // @ts-ignore
    const imageResult = await imageModel.generateContent({
      contents: [{ role: "user", parts: [{ text: imageGenPrompt }] }],
      generationConfig: {
        // @ts-ignore
        responseModalities: ["IMAGE"],
      },
    });

    const imageResponse = await imageResult.response;
    // @ts-ignore
    const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    
    let imageUrl = suggestion.imageUrl; // Varsayılan olarak orijinal görseli kullan

    if (imagePart?.inlineData) {
      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      const { url } = await put(`articles/ai-${Date.now()}.png`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      imageUrl = url;
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

    return { success: true, articleId: article.id };
  } catch (error) {
    console.error("AI Writer Hatası:", error);
    return { success: false, error: String(error) };
  }
}
