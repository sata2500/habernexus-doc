import { prisma } from "@/lib/prisma";
import { AiError, generateText, parseJsonResponse } from "@/lib/ai/client";

/** Admin panelinde editoryal kriter girilmemişse kullanılan varsayılan */
export const DEFAULT_EDITORIAL_CRITERIA = `- Türkiye okurunu doğrudan ilgilendiren, güncel ve yeni gelişmelere yüksek puan ver.
- Kamu yararı, ekonomi, teknoloji, bilim ve önemli dünya olaylarını öne çıkar.
- Magazin dedikodusu, tıklama tuzağı, reklam/basın bülteni ve tekrar eden içeriklere düşük puan ver.
- Doğrulanmamış iddia veya tek kaynaklı söylentileri düşük puanla.`;

const SCORE_THRESHOLD = 65;
const BATCH_SIZE = 15;

interface GeminiItemResult {
  id: string;
  score: number;
  isCovered: boolean;
  isStale?: boolean;
  suggestedTitles: string[];
  suggestedCategory: string;
  reasoning: string;
}

interface GeminiResponse {
  items: GeminiItemResult[];
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
  console.log("[AI Analysis] Analiz işlemi başlatıldı.");

  const settings = await prisma.systemSettings.findFirst();
  if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return { analyzed: 0, covered: 0, lowScore: 0, aiUsed: false, error: "Hiçbir yapay zekâ API anahtarı tanımlı değil." };
  }

  // 1. Yayınlanmış son haberleri çek
  const recentArticles = await prisma.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { title: true },
    take: 40,
  });

  // 2. Halihazırda analiz edilmiş ama henüz yayınlanmamış son RSS önerilerini çek
  const recentSuggestions = await prisma.rssFeedItem.findMany({
    where: {
      status: { in: ["ANALYZED", "APPROVED"] },
      publishedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    },
    select: { title: true },
    take: 60,
  });

  const pendingItems = await prisma.rssFeedItem.findMany({
    where: {
      OR: [
        { status: "PENDING" },
        {
          status: "ANALYZED",
          aiAnalysis: { path: ["isFallback"], equals: true }
        }
      ],
      dismissed: false
    },
    orderBy: { publishedAt: "desc" },
    take: BATCH_SIZE,
    include: { source: { select: { name: true, categoryHint: true } } },
  });

  if (pendingItems.length === 0) {
    console.log("[AI Analysis] Analiz edilecek bekleyen haber yok.");
    return { analyzed: 0, covered: 0, lowScore: 0, aiUsed: false };
  }

  console.log(`[AI Analysis] ${pendingItems.length} haber analiz ediliyor...`);

  // 1. Sistemdeki mevcut kategorileri çek
  const categories = await prisma.category.findMany({
    select: { name: true }
  });
  const categoryNames = categories.map(c => c.name).join(", ") || "Genel, Gündem";

  let analyzed = 0, covered = 0, lowScore = 0;

  try {
    const publishedTitles = recentArticles.map((a) => `- [Yayınlandı] ${a.title}`).join("\n");
    const suggestionTitles = recentSuggestions.map((s) => `- [Öneri] ${s.title}`).join("\n");
    const existingTitles = `${publishedTitles}\n${suggestionTitles}` || "(yok)";

    const newItems = pendingItems.map((item) => `ID: ${item.id}\nBaşlık: ${item.title}\nKaynak: ${item.source.name}\nÖzet: ${item.excerpt || ""}`).join("\n\n---\n\n");

    const editorial = settings?.aiAnalyzerPrompt?.trim() || DEFAULT_EDITORIAL_CRITERIA;
    const prompt = `Aşağıdaki haberleri analiz et ve JSON formatında döndür.

Editoryal kriterler (puanlamada bunlara göre karar ver):
${editorial}

Sistemdeki mevcut konular (mükerrer kontrolü için - hem yayınlanmış hem öneri aşamasında):
${existingTitles}

Yeni haberler:
${newItems}

Görev:
1. Her haber için bir puan (0-100), mükerrerlik durumu, tazelik durumu ve kategori önerisi belirle.
2. "isCovered" alanı: Eğer haber yukarıdaki "Mevcut Konular" listesinden biriyle aynı konuyu işliyorsa veya BU LİSTE İÇİNDEKİ başka bir haberle aynıysa true yap.
3. "isStale" alanı: Eğer haber tarihi geçmiş bir olayı (örneğin geçmiş günlerin spor skorları, süresi dolmuş duyurular) işliyorsa true yap.
4. Eğer aynı haber batch içinde birden fazla gelmişse (farklı kaynaklardan), en detaylısını ANALYZED yap, diğerlerini isCovered: true olarak işaretle.
5. "suggestedCategory" alanı SADECE aşağıdaki listede bulunan kategori isimlerinden birini içermelidir.
MEVCUT KATEGORİLER: ${categoryNames}

Format: { "items": [ { "id": "...", "score": 0-100, "isCovered": true/false, "isStale": true/false, "suggestedTitles": ["..."], "suggestedCategory": "...", "reasoning": "..." } ] }`;

    const { text: aiResponseStr, model } = await generateText("analyzer", { prompt, json: true, temperature: 0.2 });
    console.log(`[AI Analysis] Yanıt alındı: ${model}`);
    const result = parseJsonResponse<GeminiResponse>(aiResponseStr);

    if (!result.items || !Array.isArray(result.items)) {
      throw new Error("Yapay zeka yanıtı beklenen formatta değil (items dizisi bulunamadı).");
    }

    // Model yalnızca bu partideki haberleri güncelleyebilir; uydurma/yanlış kimlikler atlanır
    const pendingIds = new Set(pendingItems.map((p) => p.id));
    for (const item of result.items) {
      if (!item || typeof item.id !== "string" || !pendingIds.has(item.id)) continue;
      item.score = Math.min(100, Math.max(0, Math.round(Number(item.score) || 0)));
      const status = item.isStale
        ? "EXPIRED_STALE"
        : item.isCovered
        ? "COVERED"
        : item.score < SCORE_THRESHOLD
        ? "LOW_SCORE"
        : "ANALYZED";

      if (status === "COVERED") covered++;
      if (status === "LOW_SCORE") lowScore++;

      await prisma.rssFeedItem.update({
        where: { id: item.id },
        data: {
          aiScore: item.score,
          aiAnalysis: JSON.parse(JSON.stringify(item)),
          status,
        },
      });
      analyzed++;
    }
    return { analyzed, covered, lowScore, aiUsed: true };
  } catch (err: unknown) {
    console.error("[AI Analysis] Kritik Hata:", err);
    const errorMessage = err instanceof AiError
      ? `${err.message}${err.raw ? ` Ayrıntı: ${err.raw}` : ""}`
      : err instanceof Error ? err.message : "AI Analysis Failed";

    // Hata durumunda fallback'e devam et
    console.log("[AI Analysis] Fallback (kural tabanlı) puanlama yapılıyor...");
    for (const item of pendingItems) {
      const score = fallbackScore(item.title, item.excerpt || "", item.publishedAt);

      // Eski retry count'u al
      const prevAnalysis = item.aiAnalysis as Record<string, unknown> | null;
      const retryCount = (typeof prevAnalysis?.retryCount === "number" ? prevAnalysis.retryCount : 0) + 1;

      await prisma.rssFeedItem.update({
        where: { id: item.id },
        data: {
          aiScore: score,
          status: score < SCORE_THRESHOLD ? "LOW_SCORE" : "ANALYZED",
          aiAnalysis: {
            isFallback: true,
            retryCount,
            error: errorMessage,
            suggestedCategory: item.source.categoryHint || "Genel",
            suggestedTitles: [item.title]
          }
        },
      });
      analyzed++;
    }

    return {
      analyzed,
      covered,
      lowScore,
      aiUsed: false,
      error: errorMessage
    };
  }
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
