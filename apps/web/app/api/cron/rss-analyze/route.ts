import { NextRequest, NextResponse } from "next/server";
import { analyzeRssBatch, cleanupOldItems } from "@/lib/ai-analyzer";
import { verifySignature } from "@upstash/qstash/nextjs";

/**
 * AI Analiz QStash Webhook
 *
 * Upstash QStash tarafından tetiklenir.
 * PENDING öğeleri Gemini ile analiz eder ve puanlar.
 * Eski öğeleri temizler.
 */
async function handler(req: NextRequest) {
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
    console.error("RSS Analyze QStash Error:", error);
    return NextResponse.json(
      { error: "RSS analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}

export const POST = verifySignature(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "dummy",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "dummy",
});

