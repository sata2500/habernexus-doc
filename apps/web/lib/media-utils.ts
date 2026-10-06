import { prisma } from "./prisma";
import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { fetchPublicResource } from "./server/remote-fetch";
import { invalidateArticles } from "./server/article-cache";

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

    // 2. Ham dosyayı indir; private IP, redirect ve boyut sınırını uygula
    const buffer = await fetchPublicResource(media.url, { maxBytes: 8 * 1024 * 1024 });

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

    // 5. Önce tüm kayıtlar yeni adrese taşınır; eski dosya en son silinir (arada hata olursa
    //    haber görselsiz kalmasın — önceden dosya veritabanı güncellenmeden siliniyordu)
    const oldUrl = media.url;
    const affected = await prisma.article.findMany({ where: { coverImage: oldUrl }, select: { slug: true } });
    await prisma.$transaction([
      prisma.media.update({
        where: { id: mediaId },
        data: { url: newUrl, filename: newFilename, status: "OPTIMIZED", width: metadata.width, height: metadata.height, size: processedBuffer.length },
      }),
      prisma.article.updateMany({ where: { coverImage: oldUrl }, data: { coverImage: newUrl } }),
      prisma.user.updateMany({ where: { image: oldUrl }, data: { image: newUrl } }),
      prisma.aiPersona.updateMany({ where: { image: oldUrl }, data: { image: newUrl } }),
      prisma.slide.updateMany({ where: { imageUrl: oldUrl }, data: { imageUrl: newUrl } }),
    ]);
    await invalidateArticles(affected.map((a) => a.slug));
    await del(oldUrl).catch((e) => console.warn("[Media] Eski dosya silinemedi:", e));

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
