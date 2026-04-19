import { NextRequest, NextResponse } from "next/server";
import { analyzeRssBatch, cleanupOldItems } from "@/lib/ai-analyzer";

/**
 * AI Analiz Cron Job
 *
 * Vercel Cron ile her 4 saatte bir tetiklenir.
 * PENDING öğeleri Gemini ile analiz eder ve puanlar.
 * Eski öğeleri temizler.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. AI analiz
    const analysisResult = await analyzeRssBatch();

    // 2. Eski öğeleri temizle
    const cleanedCount = await cleanupOldItems();

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      cleaned: cleanedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("RSS Analyze Cron Error:", error);
    return NextResponse.json(
      { error: "RSS analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
