import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        _pathname,
        /* clientPayload */
      ) => {
        // Oturum kontrolü
        const reqHeaders = await headers();
        const session = await auth.api.getSession({ headers: reqHeaders });

        if (!session) {
          throw new Error("Görsel yüklemek için giriş yapmalısınız.");
        }

        // Sadece AUTHOR veya ADMIN yükleme yapabilir (isteğe bağlı kısıtlama)
        if (session.user.role !== "ADMIN" && session.user.role !== "AUTHOR") {
          throw new Error("Görsel yükleme yetkiniz yok.");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
          tokenPayload: JSON.stringify({
            userId: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Yükleme tamamlandığında DB kaydı oluşturulur
        try {
          const { userId } = JSON.parse(tokenPayload as string);

          await prisma.media.create({
            data: {
              url: blob.url,
              filename: blob.pathname,
              size: 0, // Dosya boyutu client-side'dan alınabilir veya blob metadata'dan
              mimeType: blob.contentType || "image/unknown",
              status: "RAW",
              userId: userId,
            },
          });
        } catch {
          throw new Error("Medya kaydı veritabanına işlenemedi.");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 } // The client will give an error if the status is not 200
    );
  }
}
