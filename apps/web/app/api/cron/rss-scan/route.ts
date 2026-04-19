import { NextRequest, NextResponse } from "next/server";
import { scanAllActiveSources } from "@/lib/rss-scanner";

/**
 * RSS Tarama Cron Job
 *
 * Vercel Cron ile her 2 saatte bir tetiklenir.
 * Tüm aktif RSS kaynaklarını tarar ve yeni öğeleri PENDING olarak DB'ye kaydeder.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scanAllActiveSources();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("RSS Scan Cron Error:", error);
    return NextResponse.json(
      { error: "RSS scanning failed", details: String(error) },
      { status: 500 }
    );
  }
}
