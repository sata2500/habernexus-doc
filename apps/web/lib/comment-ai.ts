import { prisma } from "./prisma";
import { cleanHtmlResponse, generateText, parseJsonResponse } from "./ai/client";

async function callAnalyzer(prompt: string, isJson: boolean = true): Promise<string> {
  const { text } = await generateText("analyzer", { prompt, json: isJson, temperature: 0.2 });
  return text;
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

    const rawResponse = await callAnalyzer(prompt, true);
    const result = parseJsonResponse<{ isToxic?: boolean; reason?: string }>(rawResponse);
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
    const rawResponse = await callAnalyzer(prompt, false);
    return cleanHtmlResponse(rawResponse);
  } catch (error) {
    console.error("[Comments AI] Generate summary error:", error);
    return null;
  }
}
