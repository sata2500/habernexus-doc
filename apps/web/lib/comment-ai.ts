import { prisma } from "./prisma";

/**
 * OpenRouter API çağrısını gerçekleştiren genel yardımcı.
 */
async function callOpenRouter(prompt: string, isJson: boolean = true): Promise<string> {
  const settings = await prisma.systemSettings.findFirst();
  const model = settings?.aiAnalyzerModel || "google/gemini-2.0-flash-001";
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com",
      "X-Title": "Haber Nexus Comments AI"
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      response_format: isJson ? { type: "json_object" } : undefined,
      temperature: 0.2
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("[Comments AI] API Hatası:", data.error);
    throw new Error(data.error?.message || "OpenRouter Error");
  }

  return data.choices?.[0]?.message?.content || "";
}

/**
 * Yorumun toksik, küfürlü, hakaret içerip içermediğini veya spam olup olmadığını denetler.
 */
export async function checkCommentToxicity(content: string): Promise<{ isToxic: boolean; reason: string }> {
  try {
    const prompt = `Aşağıdaki yorumu analiz et. Küfür, hakaret, aşağılama, tehdit, taciz, nefret söylemi veya bariz spam (reklam vb.) içerip içermediğini kontrol et.
Eğer yorum toksik veya uygunsuz ise "isToxic" değerini true yap ve sebebini Türkçe olarak "reason" alanında belirt.
Eğer yorum temiz ve uygun ise "isToxic" değerini false yap ve "reason" alanını boş bırak.

Yorum İçeriği:
"${content}"

Yanıtını SADECE aşağıdaki JSON formatında döndür:
{
  "isToxic": true/false,
  "reason": "Yorumun elenme sebebi (Örn: Küfür veya hakaret içeriyor)"
}`;

    const rawResponse = await callOpenRouter(prompt, true);
    const result = JSON.parse(rawResponse.trim());
    return {
      isToxic: !!result.isToxic,
      reason: result.reason || "Uygunsuz içerik."
    };
  } catch (error) {
    console.error("[Comments AI] Toxicity check error:", error);
    // Güvenlik gereği, API hatası alırsak yorumun geçmesine izin verelim
    return { isToxic: false, reason: "" };
  }
}

/**
 * Bir habere gelen tüm yorumları özetleyen bir AI analizi oluşturur.
 */
export async function generateCommentsSummary(articleId: string): Promise<string | null> {
  try {
    const comments = await prisma.comment.findMany({
      where: { articleId },
      select: { content: true }
    });

    if (comments.length < 3) return null;

    const commentsText = comments.map(c => `- ${c.content}`).join("\n");
    const prompt = `Aşağıda bir haber makalesine okurlar tarafından yapılan yorumlar listelenmiştir. 
Bu yorumları objektif bir şekilde analiz et ve okurların genel görüşlerini, odaklandıkları noktaları, varsa aralarındaki tartışma veya fikir birliği konularını 3-4 maddelik kısa ve öz bir Türkçe liste (HTML formatında, <ul> ve <li> etiketleri kullanarak) halinde özetle.
Hiçbir açıklama eklemeden sadece HTML listesini döndür.

Yorumlar:
${commentsText}`;

    // JSON formatı yerine HTML döneceği için text formatında alıyoruz
    const rawResponse = await callOpenRouter(prompt, false);
    return rawResponse.trim();
  } catch (error) {
    console.error("[Comments AI] Generate summary error:", error);
    return null;
  }
}
