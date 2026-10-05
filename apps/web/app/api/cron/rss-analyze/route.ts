import { NextRequest, NextResponse } from "next/server";
import { runAnalyzeJob } from "@/lib/server/jobs";
import { verifyQStashRequest } from "@/lib/server/qstash-verify";

// Tarama/analiz çok sayıda kaynak ve yapay zekâ çağrısı içerebilir
export const maxDuration = 300;

/**
 * AI Analiz QStash Webhook
 */
export async function POST(req: NextRequest) {
  // İmza Doğrulaması
  // İmza anahtarı yoksa ya da imza geçersizse istek reddedilir
  const verified = await verifyQStashRequest(req);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  try {
    const { analysis: analysisResult, cleaned: cleanedCount } = await runAnalyzeJob();

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

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

