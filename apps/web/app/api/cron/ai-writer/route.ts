import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWritingQueue } from "@/lib/news/stories";
import { describeDispatch, dispatchStories } from "@/lib/news/dispatch";
import { verifyQStashRequest } from "@/lib/server/qstash-verify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Otomatik yazım: Karar Merkezi'ndeki yazım sırasından en öncelikli konuları işçilere gönderir. */
export async function POST(req: NextRequest) {
  const verified = await verifyQStashRequest(req);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
      select: { aiWriterAutoEnabled: true, aiWriterAutoCount: true },
    });
    if (!settings?.aiWriterAutoEnabled) {
      return NextResponse.json({ success: false, error: "AI Writer otomasyonu kapalı." });
    }

    const queue = await getWritingQueue(settings.aiWriterAutoCount || 3);
    const result = await dispatchStories(queue.map((q) => q.id));
    return NextResponse.json({ success: true, message: describeDispatch(result), ...result });
  } catch (error) {
    console.error("Cron AI Writer Hatası:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
