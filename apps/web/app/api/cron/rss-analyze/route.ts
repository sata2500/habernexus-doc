import { NextRequest, NextResponse } from "next/server";
import { runAnalyzeJob } from "@/lib/server/jobs";
import { Receiver } from "@upstash/qstash";

// Tarama/analiz çok sayıda kaynak ve yapay zekâ çağrısı içerebilir
export const maxDuration = 300;

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

/**
 * AI Analiz QStash Webhook
 */
export async function POST(req: NextRequest) {
  // İmza Doğrulaması
  const signature = req.headers.get("upstash-signature");
  const bodyText = await req.text();
  const isValid = await receiver.verify({
    signature: signature || "",
    body: bodyText,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
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

