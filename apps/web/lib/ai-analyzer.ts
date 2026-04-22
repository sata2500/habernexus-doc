import { prisma } from "@/lib/prisma";

const SCORE_THRESHOLD = 40; 
const BATCH_SIZE = 15; 

interface GeminiItemResult {
  id: string;
  score: number;
  isCovered: boolean;
  suggestedTitles: string[];
  suggestedCategory: string;
  reasoning: string;
}

interface GeminiResponse {
  items: GeminiItemResult[];
}

function cleanJson(text: string) {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/**
 * OpenRouter API üzerinden analiz yapar.
 */
async function callOpenRouter(prompt: string): Promise<string> {
  const settings = await prisma.systemSettings.findFirst(); // findUnique yerine findFirst daha güvenli
  const model = settings?.aiAnalyzerModel || "google/gemini-2.0-flash-001";
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("[AI Analysis] HATA: OPENROUTER_API_KEY bulunamadı. Lütfen .env dosyasını veya Vercel ayarlarını kontrol edin.");
    throw new Error("OPENROUTER_API_KEY bulunamadı.");
  }

  console.log(`[AI Analyzer] İstek gönderiliyor. Model: ${model}`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://habernexus.com",
      "X-Title": "Haber Nexus Analysis"
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      // Bazı modeller json_object desteklemez, o yüzden text alıp temizleyeceğiz
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("[AI Analyzer] API Hatası:", data.error);
    throw new Error(data.error?.message || "OpenRouter Error");
  }

  const content = data.choices?.[0]?.message?.content || "";
  console.log(`[AI Analyzer] API Yanıtı alındı (${content.length} karakter)`);
  return content;
}

function fallbackScore(title: string, excerpt: string, publishedAt: Date | null): number {
  let score = 50;
  const age = publishedAt ? (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60) : 48;
  if (age < 2) score += 20;
  else if (age < 6) score += 10;
  if (title.length > 20) score += 5;
  return Math.min(100, Math.max(0, score));
}

export async function analyzeRssBatch() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  const recentArticles = await prisma.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { title: true },
    take: 50,
  });

  const pendingItems = await prisma.rssFeedItem.findMany({
    where: { status: "PENDING", dismissed: false },
    orderBy: { publishedAt: "desc" },
    take: BATCH_SIZE,
    include: { source: { select: { name: true, categoryHint: true } } },
  });

  if (pendingItems.length === 0) {
    console.log("[AI Analyzer] Analiz edilecek bekleyen haber yok.");
    return { analyzed: 0, covered: 0, lowScore: 0, aiUsed: false };
  }

  console.log(`[AI Analyzer] ${pendingItems.length} haber analiz ediliyor...`);

  let analyzed = 0, covered = 0, lowScore = 0;

  if (apiKey) {
    try {
      const existingTitles = recentArticles.map((a) => `- ${a.title}`).join("\n") || "(yok)";
      const newItems = pendingItems.map((item) => `ID: ${item.id}\nBaşlık: ${item.title}\nKaynak: ${item.source.name}\nÖzet: ${item.excerpt || ""}`).join("\n\n---\n\n");

      const prompt = `Aşağıdaki haberleri analiz et ve JSON formatında döndür.
Sistemdeki son haberler (mükerrer kontrolü için):
${existingTitles}

Yeni haberler:
${newItems}

Görev: Her haber için bir puan (0-100), mükerrerlik durumu ve kategori önerisi belirle.
Format: { "items": [ { "id": "...", "score": 0-100, "isCovered": true/false, "suggestedTitles": ["..."], "suggestedCategory": "...", "reasoning": "..." } ] }`;

      const aiResponse = await callOpenRouter(prompt);
      const cleanedJson = cleanJson(aiResponse);
      const result: GeminiResponse = JSON.parse(cleanedJson);

      if (!result.items || !Array.isArray(result.items)) {
        throw new Error("Geçersiz JSON yapısı");
      }

      for (const item of result.items) {
        const status = item.isCovered ? "COVERED" : item.score < SCORE_THRESHOLD ? "LOW_SCORE" : "ANALYZED";
        if (status === "COVERED") covered++;
        if (status === "LOW_SCORE") lowScore++;
        
        await prisma.rssFeedItem.update({
          where: { id: item.id },
          data: {
            aiScore: item.score,
            aiAnalysis: item as any,
            status,
          },
        });
        analyzed++;
      }
      return { analyzed, covered, lowScore, aiUsed: true };
    } catch (err) {
      console.error("[AI Analysis] Kritik Hata:", err);
      // Hata durumunda fallback'e devam et
    }
  } else {
    console.warn("[AI Analysis] OPENROUTER_API_KEY bulunamadı, yapay zeka analizi atlanıyor.");
  }

  console.log("[AI Analysis] Fallback (kural tabanlı) puanlama yapılıyor...");
  // Fallback
  for (const item of pendingItems) {
    const score = fallbackScore(item.title, item.excerpt || "", item.publishedAt);
    await prisma.rssFeedItem.update({
      where: { id: item.id },
      data: { aiScore: score, status: score < SCORE_THRESHOLD ? "LOW_SCORE" : "ANALYZED" },
    });
    analyzed++;
  }

  return { analyzed, covered, lowScore, aiUsed: false };
}

/**
 * Eski RSS öğelerini temizler.
 */
export async function cleanupOldItems(): Promise<number> {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const retentionDays = settings?.rssRetentionDays || 14;
    const deleteBefore = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await prisma.rssFeedItem.deleteMany({
      where: {
        publishedAt: { lt: deleteBefore },
        usedForArticle: false, // Makale yazılmamış olanları sil
      },
    });

    console.log(`[RSS Cleanup] ${result.count} eski öğe temizlendi.`);
    return result.count;
  } catch (error) {
    console.error("RSS Cleanup Error:", error);
    return 0;
  }
}
