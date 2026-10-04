import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Client, Receiver } from "@upstash/qstash";
import { getAppUrl } from "@/lib/utils";
import { getWritingQueue } from "@/lib/news/stories";

export const dynamic = "force-dynamic";

const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

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
    const APP_URL = getAppUrl();
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });

    if (!settings || !settings.aiWriterAutoEnabled) {
      return NextResponse.json({ success: false, error: "AI Writer otomasyonu kapalı." });
    }

    // Karar Merkezi'ndeki yazım sırasından en öncelikli konular
    const queue = await getWritingQueue(settings.aiWriterAutoCount || 3);
    if (queue.length === 0) {
      return NextResponse.json({ success: true, message: "Yazım sırasında eşiği geçen konu yok." });
    }

    // Her konuyu ayrı bir işçiye gönder (biri hata verirse diğerleri etkilenmez)
    const results = [];
    for (const item of queue) {
      try {
        await qstash.publishJSON({
          url: `${APP_URL}/api/ai-writer/worker`,
          body: { storyId: item.id },
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

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
