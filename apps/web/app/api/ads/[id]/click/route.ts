import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appCache } from "@/lib/cache";
import { getRequestIdentity } from "@/lib/server/rate-limit";

/** Sponsor tıklaması: sayılır ve reklam verenin adresine yönlendirilir (aynı kişi saatte bir sayılır) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = /^[a-z0-9]{10,40}$/.test(id)
    ? await prisma.sponsorAd.findUnique({ where: { id }, select: { linkUrl: true } })
    : null;
  if (!ad) return NextResponse.redirect(new URL("/", req.url), 302);

  try {
    if (await appCache.claim(`ad-click:${id}:${getRequestIdentity(req)}`, 3600)) {
      await prisma.sponsorAd.update({ where: { id }, data: { clicks: { increment: 1 } } });
    }
  } catch (e) {
    console.error("[Sponsor] Tıklama sayılamadı:", e);
  }
  const res = NextResponse.redirect(ad.linkUrl, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
