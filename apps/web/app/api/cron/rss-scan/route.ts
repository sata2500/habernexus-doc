import { NextRequest, NextResponse } from "next/server";
import { runScanJob } from "@/lib/server/jobs";
import { verifyQStashRequest } from "@/lib/server/qstash-verify";

// Tarama/analiz çok sayıda kaynak ve yapay zekâ çağrısı içerebilir
export const maxDuration = 300;

/**
 * RSS Tarama QStash Webhook
 */
export async function POST(req: NextRequest) {
  // İmza Doğrulaması
  // İmza anahtarı yoksa ya da imza geçersizse istek reddedilir
  const verified = await verifyQStashRequest(req);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  try {
    const result = await runScanJob();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("RSS Scan QStash Error:", error);
    return NextResponse.json(
      { error: "RSS scanning failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

