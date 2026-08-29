import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { optimizeMedia } from "@/lib/media-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const MediaIdSchema = z.string().trim().min(1).max(100);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "AUTHOR") {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const { id } = await params;
  const parsedId = MediaIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Geçersiz medya." }, { status: 400 });
  }

  const media = await prisma.media.findUnique({
    where: { id: parsedId.data },
    select: { id: true, userId: true },
  });

  if (!media) {
    return NextResponse.json({ error: "Medya bulunamadı." }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && media.userId !== session.user.id) {
    return NextResponse.json({ error: "Bu medyayı optimize etme yetkiniz yok." }, { status: 403 });
  }

  try {
    const result = await optimizeMedia(media.id);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Media optimization error:", error);
    return NextResponse.json(
      { error: "Medya optimize edilemedi." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
