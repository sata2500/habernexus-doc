import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_AVAILABLE = !!GEMINI_API_KEY;

const SCORE_THRESHOLD = 40; // Bu puanın altındakileri LOW_SCORE yap
const BATCH_SIZE = 15; // Tek seferde Gemini'ye gönderilecek max haber sayısı

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

/**
 * AI analizi mevcut değilse kullanılan basit puanlama.
 * Taze + özet uzunluğu + başlık uzunluğuna göre tahmini puan verir.
 */
function fallbackScore(
  title: string,
  excerpt: string,
  publishedAt: Date | null
): number {
  let score = 50;
  const age = publishedAt
    ? (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60)
    : 48;
  if (age < 2) score += 20;
  else if (age < 6) score += 10;
  else if (age > 24) score -= 15;
  else if (age > 48) score -= 25;

  if (title.length > 20 && title.length < 100) score += 5;
  if (excerpt.length > 100) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * PENDING öğeleri Gemini ile analiz eder ve DB'yi günceller.
 * Gemini API key yoksa fallback puanlama kullanır.
 */
export async function analyzeRssBatch(): Promise<{
  analyzed: number;
  covered: number;
  lowScore: number;
  aiUsed: boolean;
  error?: string;
}> {
  // Son 7 günün makale başlıklarını çek (kapsama kontrolü için)
  const recentArticles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { title: true },
    take: 50,
  });

  // PENDING öğeleri çek
  const pendingItems = await prisma.rssFeedItem.findMany({
    where: { status: "PENDING", dismissed: false },
    orderBy: { publishedAt: "desc" },
    take: BATCH_SIZE,
    include: { source: { select: { name: true, categoryHint: true } } },
  });

  if (pendingItems.length === 0) {
    return { analyzed: 0, covered: 0, lowScore: 0, aiUsed: false };
  }

  let analyzed = 0;
  let covered = 0;
  let lowScore = 0;

  // --- AI MODU ---
  if (AI_AVAILABLE) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const existingTitles =
        recentArticles.map((a) => `- ${a.title}`).join("\n") ||
        "(Henüz yayınlanmış makale yok)";

      const newItems = pendingItems
        .map(
          (item) =>
            `ID: ${item.id}\nBaşlık: ${item.title}\nKaynak: ${item.source.name}\nÖzet: ${item.excerpt || "(yok)"}`
        )
        .join("\n\n---\n\n");

      const prompt = `Sen Türk bir haber editörü asistanısın. Aşağıda son 7 günde yayınlanan mevcut makaleler ve RSS'ten gelen yeni haberler var.

## Mevcut Yayınlanmış Makaleler (Bu konular ZATEN haberleştirildi):
${existingTitles}

## Değerlendirilecek Yeni RSS Haberleri:
${newItems}

Her RSS haberi için şunları belirle:
1. "score" (0-100): Haber potansiyeli puanı. 
   - Yüksek puan: Güncel, dikkat çekici, özgün, Türk okuyucuya hitap eden
   - Düşük puan: Eski, sıradan, reklam içerikli, düşük değerli
2. "isCovered" (true/false): Mevcut makalelerle aynı konuyu mu işliyor?
3. "suggestedTitles": Türk okuyucu için 2 farklı başlık alternatifi
4. "suggestedCategory": En uygun kategori (Gündem, Teknoloji, Ekonomi, Spor, Sağlık, Dünya, Kültür, Diğer)
5. "reasoning": Neden bu puanı verdiğini 1 cümleyle açıkla

SADECE JSON formatında yanıt ver. Başka hiçbir şey yazma:
{
  "items": [
    {
      "id": "...",
      "score": 75,
      "isCovered": false,
      "suggestedTitles": ["Başlık 1", "Başlık 2"],
      "suggestedCategory": "Teknoloji",
      "reasoning": "Neden bu puan"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // JSON parse et (Gemini bazen markdown code block içine koyar)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Gemini geçerli JSON döndürmedi");

      const parsed: GeminiResponse = JSON.parse(jsonMatch[0]);

      // Sonuçları DB'ye yaz
      for (const result of parsed.items) {
        const item = pendingItems.find((p) => p.id === result.id);
        if (!item) continue;

        let newStatus: "ANALYZED" | "LOW_SCORE" | "COVERED";
        if (result.isCovered) {
          newStatus = "COVERED";
          covered++;
        } else if (result.score < SCORE_THRESHOLD) {
          newStatus = "LOW_SCORE";
          lowScore++;
        } else {
          newStatus = "ANALYZED";
          analyzed++;
        }

        await prisma.rssFeedItem.update({
          where: { id: result.id },
          data: {
            status: newStatus,
            aiScore: result.score,
            aiAnalysis: {
              suggestedTitles: result.suggestedTitles,
              suggestedCategory: result.suggestedCategory,
              reasoning: result.reasoning,
              isCovered: result.isCovered,
              analyzedAt: new Date().toISOString(),
            },
          },
        });
      }

      return { analyzed, covered, lowScore, aiUsed: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Gemini analiz hatası, fallback'e geçiliyor:", errorMsg);
      // Gemini başarısız olursa fallback'e düş
    }
  }

  // --- FALLBACK MODU (API key yok veya Gemini hatası) ---
  const existingTitleSet = new Set(
    recentArticles.map((a) => a.title.toLowerCase())
  );

  for (const item of pendingItems) {
    const score = fallbackScore(item.title, item.excerpt || "", item.publishedAt);
    const lowerTitle = item.title.toLowerCase();

    // Basit kelime örtüşümü kontrolü
    const isCovered = recentArticles.some((a) => {
      const words = lowerTitle.split(" ").filter((w) => w.length > 4);
      const matchCount = words.filter((w) =>
        a.title.toLowerCase().includes(w)
      ).length;
      return matchCount >= Math.min(3, words.length * 0.6);
    });

    let newStatus: "ANALYZED" | "LOW_SCORE" | "COVERED";
    if (isCovered) {
      newStatus = "COVERED";
      covered++;
    } else if (score < SCORE_THRESHOLD) {
      newStatus = "LOW_SCORE";
      lowScore++;
    } else {
      newStatus = "ANALYZED";
      analyzed++;
    }

    await prisma.rssFeedItem.update({
      where: { id: item.id },
      data: {
        status: newStatus,
        aiScore: score,
        aiAnalysis: {
          suggestedTitles: [item.title],
          suggestedCategory: item.source.categoryHint || "Genel",
          reasoning: "Otomatik puan (AI aktif değil)",
          isCovered,
          analyzedAt: new Date().toISOString(),
        },
      },
    });
  }

  return {
    analyzed,
    covered,
    lowScore,
    aiUsed: false,
    error: AI_AVAILABLE ? undefined : "GEMINI_API_KEY tanımlı değil",
  };
}

export async function cleanupOldItems(): Promise<number> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "global" },
    select: { rssRetentionDays: true },
  });
  
  const retentionDays = settings?.rssRetentionDays ?? 14;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  const result = await prisma.rssFeedItem.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      status: { in: ["LOW_SCORE", "COVERED", "DISMISSED"] },
    },
  });
  return result.count;
}
