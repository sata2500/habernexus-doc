import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { recordRead } from "@/lib/server/reading-history";

const ReadingSchema = z.object({
  articleId: z.string().trim().min(1).max(100),
  progress: z.number().min(0).max(100),
});

/**
 * Okuma ilerlemesini giriş yapmış okurun hesabına kaydeder.
 * POST /api/reading { articleId, progress }  (sendBeacon ile de gönderilebilir)
 * Giriş yapılmamışsa hiçbir şey kaydedilmez (ilerleme yalnızca o cihazda tutulur).
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) return NextResponse.json({ saved: false }, { headers: { "Cache-Control": "no-store" } });

  const rate = await checkRateLimitAsync(`reading:${session.user.id}`, 120, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ saved: false }, { status: 429 });

  const text = await req.text().catch(() => "");
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* geçersiz gövde */ }
  const parsed = ReadingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const article = await prisma.article.findFirst({
    where: { id: parsed.data.articleId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!article) return NextResponse.json({ error: "Haber bulunamadı." }, { status: 404 });

  try {
    const result = await recordRead(session.user.id, article.id, parsed.data.progress);
    return NextResponse.json({ saved: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Okuma geçmişi tablosu henüz yoksa okuma deneyimini bozma
    console.error("Reading history error:", error);
    return NextResponse.json({ saved: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
