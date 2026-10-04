import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFeedPage } from "@/lib/feed";

const FeedQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
  category: z.string().trim().max(100).regex(/^[a-z0-9-]+$/).optional(),
});

/**
 * Sayfalı haber akışı (ana sayfa "Daha fazla yükle" ve /latest sonsuz kaydırma).
 * GET /api/feed?cursor=...&limit=12&category=gundem
 */
export async function GET(req: NextRequest) {
  const parsed = FeedQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  try {
    const page = await getFeedPage({
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
      categorySlug: parsed.data.category,
    });

    return NextResponse.json(page, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Feed API error:", error);
    return NextResponse.json({ error: "Haberler yüklenemedi." }, { status: 500 });
  }
}
