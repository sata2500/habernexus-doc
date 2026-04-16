import { prisma } from "./prisma";
import { put, del } from "@vercel/blob";
import sharp from "sharp";

/**
 * Mevcut bir ham görseli Vercel Blob'dan çeker, Sharp ile optimize eder
 * ve yeni halini kaydedip eskisini siler.
 */
export async function optimizeMedia(mediaId: string) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media || media.status !== "RAW") {
    throw new Error("Geçerli bir ham medya bulunamadı.");
  }

  try {
    // 1. Durumu 'PROCESSING' yap
    await prisma.media.update({
      where: { id: mediaId },
      data: { status: "PROCESSING" },
    });

    // 2. Ham dosyayı indir
    const response = await fetch(media.url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Sharp ile optimize et
    const processedBuffer = await sharp(buffer)
      .resize(1200, undefined, { withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer();

    const metadata = await sharp(processedBuffer).metadata();

    // 4. Yeni dosyayı Vercel Blob'a yükle
    const newFilename = media.filename.replace(/\.[^/.]+$/, "") + "_optimized.webp";
    const { url: newUrl } = await put(newFilename, processedBuffer, {
      access: "public",
      contentType: "image/webp",
    });

    // 5. Eski dosyayı Vercel Blob'dan sil
    await del(media.url);

    // 6. DB Kaydını güncelle
    await prisma.media.update({
      where: { id: mediaId },
      data: {
        url: newUrl,
        filename: newFilename,
        status: "OPTIMIZED",
        width: metadata.width,
        height: metadata.height,
        size: processedBuffer.length,
      },
    });

    return { success: true, url: newUrl };
  } catch (error) {
    console.error("Optimization error:", error);
    await prisma.media.update({
      where: { id: mediaId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
