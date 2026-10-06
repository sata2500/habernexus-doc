import { NextRequest, NextResponse } from "next/server";
import { runQualityPass, writeArticleWithAI, writeStory } from "@/lib/ai-writer";
import { verifyQStashRequest } from "@/lib/server/qstash-verify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Yapay zekâ işçisi (QStash tetikler). İki iş yapar:
 * - `{ storyId }` / `{ suggestionId }`: bir konuyu haberleştirip yayımlar
 * - `{ task: "quality", articleId }`: yeni haberin analizi ve gerekirse özgünleştirilmesi
 */
export async function POST(req: NextRequest) {
  // İmza anahtarı yoksa ya da imza geçersizse istek reddedilir
  const verified = await verifyQStashRequest(req);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  try {
    const body = JSON.parse(verified.body) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);

    if (body.task === "quality") {
      const articleId = str(body.articleId);
      if (!articleId) return NextResponse.json({ success: false, error: "articleId eksik" }, { status: 400 });
      await runQualityPass(articleId);
      return NextResponse.json({ success: true });
    }

    const storyId = str(body.storyId);
    const suggestionId = str(body.suggestionId);
    if (!storyId && !suggestionId) {
      return NextResponse.json({ success: false, error: "storyId eksik" }, { status: 400 });
    }

    console.log(`[AI Worker] Haber yazımı başlatılıyor: ${storyId ? `konu=${storyId}` : `öneri=${suggestionId}`}`);
    const result = storyId ? await writeStory(storyId) : await writeArticleWithAI(suggestionId!);

    if (result.success) {
      console.log(`[AI Worker] ${result.skipped ? "Atlandı" : "Başarılı"}: ${result.title}`);
      return NextResponse.json({ success: true, articleId: result.articleId, skipped: result.skipped ?? false });
    }
    // Kalıcı hatalarda QStash'in tekrar denemesini önlemek için 200 dönülür; konu sıraya geri döner ya da FAILED olur
    console.error(`[AI Worker] Yazım Hatası: ${result.error}`);
    return NextResponse.json({ success: false, error: result.error });
  } catch (error) {
    console.error("[AI Worker] Beklenmedik Kritik Hata:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
