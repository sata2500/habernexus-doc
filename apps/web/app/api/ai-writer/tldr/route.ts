import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimitAsync, getRequestIdentity } from "@/lib/server/rate-limit";
import { getOrCreateSummary } from "@/lib/tldr";

const TldrInputSchema = z.object({
  articleId: z.string().trim().min(1).max(100),
});

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const noStore = { "Cache-Control": "no-store" };

/**
 * Yayındaki haberin 3 maddelik özeti. Metin istemciden alınmaz, veritabanından okunur;
 * özet her haber sürümü için bir kez üretilip saklanır.
 * POST /api/ai-writer/tldr { articleId }
 */
export async function POST(req: Request) {
  const rate = await checkRateLimitAsync(`tldr:${getRequestIdentity(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), ...noStore } },
    );
  }

  const input = TldrInputSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400, headers: noStore });
  }

  const article = await prisma.article.findFirst({
    where: { id: input.data.articleId, status: "PUBLISHED" },
    select: { id: true, title: true, content: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Haber bulunamadı." }, { status: 404, headers: noStore });
  }

  try {
    const summary = await getOrCreateSummary(article);
    return NextResponse.json(summary, { headers: noStore });
  } catch (error: unknown) {
    console.error("TLDR API error:", error);
    return NextResponse.json({ error: "Özet servisi şu anda kullanılamıyor." }, { status: 502, headers: noStore });
  }
}
