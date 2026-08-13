import { prisma } from "./prisma";

// Helper to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * OpenRouter API kullanarak analiz verisini JSON formatinda uretir.
 */
async function generateAnalysisWithOpenRouter(model: string, articleTitle: string, articleContent: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY eksik.");

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

  const userPrompt = `
Haber Basligi: "${articleTitle}"
Haber Icerigi:
${articleContent}
  `;

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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenRouter Analiz Hatasi: ${data.error?.message || response.statusText}`);
  }

  const rawContent = data.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(rawContent.trim());
  } catch (_parseError) {
    console.error("JSON parse hatasi. Gelen ham veri:", rawContent);
    // Regex ile JSON bloklarini ayiklamaya calis
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0].trim());
    }
    throw new Error("Yapay zeka gecersiz bir JSON formatinda yanit verdi.");
  }
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

    const settings = await prisma.systemSettings.findFirst();
    const analyzerModel = settings?.aiAnalyzerModel || "google/gemini-2.0-flash-001";

    console.log(`[Article Analyzer] Analiz baslatiliyor. Makale: "${article.title}" (${article.id}), Model: ${analyzerModel}`);

    let analysisResult: Record<string, unknown> | null = null;
    let error: unknown = null;

    // Retry mantigi
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        analysisResult = await generateAnalysisWithOpenRouter(analyzerModel, article.title, article.content);
        break;
      } catch (err: unknown) {
        error = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Article Analyzer] Deneme ${attempt} basarisiz. Hata:`, msg);
        if (attempt < 3) {
          await sleep(2000 * attempt);
        }
      }
    }

    if (!analysisResult) {
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Makale analiz edilemedi. Son hata: ${errMsg}`);
    }

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
    const errMsg = err instanceof Error ? err.message : "Bilinmeyen bir analiz hatasi olustu.";
    console.error(`[Article Analyzer] HATA:`, errMsg);
    return {
      success: false,
      error: errMsg
    };
  }
}
