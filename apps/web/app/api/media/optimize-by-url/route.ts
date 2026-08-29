import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { optimizeMedia } from "@/lib/media-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const OptimizeByUrlSchema = z.object({
  url: z.string().trim().url().max(2048),
});

export async function POST(request: NextRequest) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "AUTHOR") {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = OptimizeByUrlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Geçerli bir medya URL'si gerekli." }, { status: 400 });
    }

    const media = await prisma.media.findUnique({
      where: { url: parsed.data.url },
      select: { id: true, userId: true },
    });

    if (!media) {
      return NextResponse.json({ error: "Medya bulunamadı." }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && media.userId !== session.user.id) {
      return NextResponse.json({ error: "Bu medyayı optimize etme yetkiniz yok." }, { status: 403 });
    }

    const result = await optimizeMedia(media.id);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Media optimization by URL error:", error);
    return NextResponse.json(
      { error: "Medya optimize edilemedi." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
