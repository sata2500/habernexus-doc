import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeBatchArticlesWithAI } from "@/lib/ai-writer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });

    if (!settings || !settings.aiWriterAutoEnabled) {
      return NextResponse.json({ success: false, error: "AI Writer otomasyonu kapalı." });
    }

    const results = await writeBatchArticlesWithAI(settings.aiWriterAutoCount);

    return NextResponse.json({
      success: true,
      processed: results.length,
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
