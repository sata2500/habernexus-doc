import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Client } from "@upstash/qstash";

export const dynamic = "force-dynamic";

const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com";

export async function POST(req: NextRequest) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });

    if (!settings || !settings.aiWriterAutoEnabled) {
      return NextResponse.json({ success: false, error: "AI Writer otomasyonu kapalı." });
    }

    // Yazılacak haberleri seç
    const suggestions = await prisma.rssFeedItem.findMany({
      where: {
        status: { in: ["ANALYZED", "APPROVED"] },
        dismissed: false,
        usedForArticle: false,
      },
      orderBy: { aiScore: "desc" },
      take: settings.aiWriterAutoCount || 3,
    });

    if (suggestions.length === 0) {
      return NextResponse.json({ success: true, message: "Yazılacak yeni haber önerisi bulunamadı." });
    }

    // Her bir haberi QStash kuyruğuna (Worker'a) gönder
    const results = [];
    for (const item of suggestions) {
      try {
        await qstash.publishJSON({
          url: `${APP_URL}/api/ai-writer/worker`,
          body: { suggestionId: item.id },
          // Her haber arasında hafif bir gecikme ekleyebiliriz (isteğe bağlı)
          // delay: i * 30 
        });
        results.push({ id: item.id, status: "ENQUEUED" });
      } catch (err) {
        console.error(`[Cron] QStash publish hatası (${item.id}):`, err);
        results.push({ id: item.id, status: "FAILED", error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      enqueued: results.filter(r => r.status === "ENQUEUED").length,
      results,
    });
  } catch (error) {
    console.error("Cron AI Writer Hatası:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// GET isteğine de izin ver (test amaçlı)
export async function GET(req: NextRequest) {
  return POST(req);
}
