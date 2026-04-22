import { NextRequest, NextResponse } from "next/server";
import { writeArticleWithAI } from "@/lib/ai-writer";
import { verifySignature } from "@upstash/qstash/nextjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 dakika (Vercel Pro için)

/**
 * AI Writer Worker
 * 
 * Bu endpoint tek bir haberi asenkron olarak yazar.
 * QStash tarafından tetiklenir.
 */
async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { suggestionId } = body;

    if (!suggestionId) {
      return NextResponse.json({ success: false, error: "suggestionId eksik" }, { status: 400 });
    }

    console.log(`[AI Worker] Haber yazımı başlatıldı: ${suggestionId}`);
    const result = await writeArticleWithAI(suggestionId);

    if (result.success) {
      console.log(`[AI Worker] Haber başarıyla yazıldı: ${result.title}`);
      return NextResponse.json({ success: true, articleId: result.articleId });
    } else {
      console.error(`[AI Worker] Haber yazımı başarısız: ${result.error}`);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("[AI Worker] Beklenmedik hata:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// QStash imza doğrulaması ile koru
export const POST = verifySignature(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "dummy",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "dummy",
});
