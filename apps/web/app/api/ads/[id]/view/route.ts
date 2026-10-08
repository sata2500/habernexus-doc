import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appCache } from "@/lib/cache";
import { getRequestIdentity } from "@/lib/server/rate-limit";

/** Sponsor gösterimi (reklam ekranda en az yarısı görününce bir kez). Aynı kişi 30 dakikada bir sayılır. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new NextResponse(null, { status: 204 });
  try {
    if (await appCache.claim(`ad-view:${id}:${getRequestIdentity(req)}`, 1800)) {
      await prisma.sponsorAd.updateMany({ where: { id }, data: { impressions: { increment: 1 } } });
    }
  } catch (e) {
    console.error("[Sponsor] Gösterim sayılamadı:", e);
  }
  return new NextResponse(null, { status: 204 });
}
