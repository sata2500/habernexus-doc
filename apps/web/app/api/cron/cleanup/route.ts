import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runRetentionCleanup } from "@/lib/server/retention";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest, secret: string) {
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Günlük kişisel veri temizliği (Vercel Cron, vercel.json). Vercel isteğe
 * `Authorization: Bearer <CRON_SECRET>` ekler; anahtar tanımlı değilse iş çalışmaz.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[Temizlik] CRON_SECRET tanımlı değil; saklama süresi temizliği çalışmadı.");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }
  if (!authorized(req, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const deleted = await runRetentionCleanup();
    console.info("[Temizlik] Süresi dolan kayıtlar silindi:", deleted);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("[Temizlik] Hata:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
