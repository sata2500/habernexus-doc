import { prisma } from "./prisma";
import { AiError, generateText, parseJsonResponse } from "./ai/client";


/**
 * Analiz modelinden makale kalite raporunu JSON olarak alır.
 */
async function generateAnalysis(articleTitle: string, articleContent: string): Promise<Record<string, unknown>> {
  const systemPrompt = `Sen profesyonel bir haber editoru ve Turkce icerik kalite analistisin.
Gorevin, sana verilen haber makalesini detayli bir sekilde analiz etmektir.
Analizinde anlamsal (semantic) ozgunluk/intihal oranini, SEO uyumlulugunu, Turkce okunabilirlik seviyesini ve genel yazim kalitesini olcmelisin.

Aşağıdaki kurallara gore degerlendir:
1. Plagiarism (Intihal): Anlamsal olarak baska kaynaklardan kopyalanma, klişe yapilarin tekrarı veya dogrudan yapay zeka tarafindan yazilma (AI izleri) durumunu degerlendir. 0 (tamamen ozgun) ile 100 (tamamen kopya/intihal) arasinda bir intihal skoru (plagiarismRate) ver.
2. SEO Score: Baslik hiyerarsisi (h2, h3 kullanimi), anahtar kelime yerlesimi, makale uzunlugu (haberler icin en az 300-500 kelime idealdir), spot/ozet kalitesine gore 0-100 arasi puan ver.
3. Readability Score: Turkce cumle yapilarinin akiciligi, paragraf uzunluklari (cok uzun paragraflar okunabilirligi dusurur) ve genel anlasilirlik uzerinden 0-100 arasi puan ver.
4. Quality Score: Dil bilgisi kurallarina uyum, tarafsiz haber dili kullanimi, basligin icerikle uyumu ve genel gazeticilik kalitesine gore 0-100 arasi puan ver.
5. Suggestions: Yazarın makaleyi gelistirebilmesi icin en az 2-3 adet somut ve yapici Turkce iyileştirme onerisi sun.

Donus formatin MUTLAKA asagidaki JSON semasina birebir uymali ve sadece gecerli bir JSON objesi olmalidir. Hicbir aciklama veya markdown blogu ekleme, sadece JSON dondur:

{
  "plagiarismRate": number,
  "seoScore": number,
  "readabilityScore": number,
  "qualityScore": number,
  "analysisReport": {
    "plagiarism": {
      "score": number,
      "aiProbability": number,
      "sources": [
        { "url": "string", "title": "string", "matchPercent": number }
      ],
      "comment": "Turkce intihal analizi ozeti"
    },
    "seo": {
      "score": number,
      "hasHeadingStructure": boolean,
      "keywordSuggestions": ["string"],
      "comment": "Turkce SEO analizi ozeti"
    },
    "readability": {
      "score": number,
      "comment": "Turkce okunabilirlik analizi ozeti"
    },
    "suggestions": ["string"]
  }
}`;

  const plain = articleContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 30000);
  const { text } = await generateText("analyzer", {
    system: systemPrompt,
    prompt: `Haber Basligi: "${articleTitle}"\nHaber Icerigi:\n${plain}`,
    json: true,
    temperature: 0.2,
  });
  return parseJsonResponse<Record<string, unknown>>(text);
}

/**
 * Bir makalenin intihal ve kalite skorlarini analiz eder ve veritabanina kaydeder.
 */
export async function analyzeArticle(articleId: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true, content: true }
    });

    if (!article) {
      throw new Error(`Makale bulunamadi: ${articleId}`);
    }

    console.log(`[Article Analyzer] Analiz baslatiliyor. Makale: "${article.title}" (${article.id})`);

    // Tekrar deneme ve yedek model ortak AI katmanında yapılır
    const analysisResult = await generateAnalysis(article.title, article.content);

    // Degerlerin dogrulanmasi ve veritabanina kaydedilmesi
    const plagiarismRate = Math.min(100, Math.max(0, typeof analysisResult.plagiarismRate === "number" ? analysisResult.plagiarismRate : 0));
    const seoScore = Math.min(100, Math.max(0, typeof analysisResult.seoScore === "number" ? analysisResult.seoScore : 0));
    const readabilityScore = Math.min(100, Math.max(0, typeof analysisResult.readabilityScore === "number" ? analysisResult.readabilityScore : 0));
    const qualityScore = Math.min(100, Math.max(0, typeof analysisResult.qualityScore === "number" ? analysisResult.qualityScore : 0));
    const reportJson = (analysisResult.analysisReport as Record<string, unknown>) || {};

    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        plagiarismRate,
        seoScore,
        readabilityScore,
        qualityScore,
        analysisReport: JSON.parse(JSON.stringify(reportJson))
      }
    });

    console.log(`[Article Analyzer] Analiz basariyla tamamlandi. Skorlar: İntihal=%${plagiarismRate}, SEO=${seoScore}, Okunabilirlik=${readabilityScore}, Kalite=${qualityScore}`);

    return {
      success: true,
      plagiarismRate,
      seoScore,
      readabilityScore,
      qualityScore,
      analysisReport: reportJson,
      article: updatedArticle
    };

  } catch (err: unknown) {
    const errMsg = err instanceof AiError
      ? `${err.message}${err.raw ? ` Ayrıntı: ${err.raw}` : ""}`
      : err instanceof Error ? err.message : "Bilinmeyen bir analiz hatasi olustu.";
    console.error(`[Article Analyzer] HATA:`, errMsg);
    return {
      success: false,
      error: errMsg
    };
  }
}
