import { NextRequest, NextResponse } from "next/server";
import { writeArticleWithAI } from "@/lib/ai-writer";
import { Receiver } from "@upstash/qstash";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 dakika (Vercel Pro için)

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

/**
 * AI Writer Worker
 * Bu endpoint tek bir haberi asenkron olarak yazar. QStash tarafından tetiklenir.
 */
export async function POST(req: NextRequest) {
  // 1. İmza Doğrulaması (Manuel)
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const bodyText = await req.text();
  const isValid = await receiver.verify({
    signature,
    body: bodyText,
  }).catch(() => false);

  if (!isValid) {
    console.error("[AI Worker] Geçersiz QStash imzası!");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const body = JSON.parse(bodyText);
    const { suggestionId } = body;

    if (!suggestionId) {
      return NextResponse.json({ success: false, error: "suggestionId eksik" }, { status: 400 });
    }

    console.log(`[AI Worker] Haber yazımı başlatılıyor: ID=${suggestionId}`);
    const result = await writeArticleWithAI(suggestionId);

    if (result.success) {
      console.log(`[AI Worker] Başarılı: ${result.title}`);
      return NextResponse.json({ success: true, articleId: result.articleId });
    } else {
      console.error(`[AI Worker] Yazım Hatası: ${result.error}`);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("[AI Worker] Beklenmedik Kritik Hata:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
