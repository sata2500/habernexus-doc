import { NextRequest, NextResponse } from "next/server";
import { scanAllActiveSources } from "@/lib/rss-scanner";
import { verifySignature } from "@upstash/qstash/nextjs";

/**
 * RSS Tarama QStash Webhook
 *
 * Upstash QStash tarafından tetiklenir.
 * Tüm aktif RSS kaynaklarını tarar ve yeni öğeleri PENDING olarak DB'ye kaydeder.
 */
async function handler(req: NextRequest) {
  try {
    const result = await scanAllActiveSources();

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

export const POST = verifySignature(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "dummy",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "dummy",
});

