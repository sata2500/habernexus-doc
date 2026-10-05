import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/authz";

import { checkRateLimitAsync, getRequestIdentity } from "@/lib/server/rate-limit";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_PROFILE_BYTES = 2 * 1024 * 1024;
const UploadTokenPayloadSchema = z.object({ userId: z.string().min(1).max(100) });
const ClientPayloadSchema = z.object({ type: z.enum(["profile", "article"]) });

const UPLOAD_RATE_LIMIT = 20;
const UPLOAD_WINDOW_MS = 60 * 1000;

export async function POST(request: Request): Promise<NextResponse> {
  const rate = await checkRateLimitAsync(`upload:${getRequestIdentity(request)}`, UPLOAD_RATE_LIMIT, UPLOAD_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Çok fazla dosya yükleme isteği. Lütfen bir dakika sonra tekrar deneyin." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = ClientPayloadSchema.safeParse(clientPayload ? JSON.parse(clientPayload) : null);
        // Okurlar yalnızca kendi profil fotoğrafını yükleyebilir; haber görselleri yazar ve admine açık
        const isProfile = payload.success && payload.data.type === "profile";
        const session = isProfile ? await requireRole("USER", "AUTHOR", "ADMIN") : await requireRole("AUTHOR", "ADMIN");

        return {
          allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: isProfile && session.user.role === "USER" ? MAX_PROFILE_BYTES : MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const parsedPayload = UploadTokenPayloadSchema.safeParse(
          typeof tokenPayload === "string" ? JSON.parse(tokenPayload) : null,
        );
        if (!parsedPayload.success) throw new Error("Geçersiz upload token payload.");

        if (!ALLOWED_CONTENT_TYPES.includes(blob.contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
          throw new Error("Desteklenmeyen görsel türü.");
        }

        await prisma.media.create({
          data: {
            url: blob.url,
            filename: blob.pathname,
            size: 0,
            mimeType: blob.contentType,
            status: "RAW",
            userId: parsedPayload.data.userId,
          },
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Görsel yüklenemedi. Dosya türünü ve boyutunu kontrol edin." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
