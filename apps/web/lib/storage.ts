import { put, del } from "@vercel/blob";
import sharp from "sharp";

export type UploadType = "profile" | "article";

interface UploadOptions {
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
  format?: "webp" | "avif";
}

/**
 * Görseli işler (Sharp ile optimize eder) ve Vercel Blob üzerine kaydeder.
 */
export async function processAndSaveImage(
  file: File,
  options: UploadOptions
): Promise<{
  success: boolean;
  url?: string;
  width?: number;
  height?: number;
  size?: number;
  error?: string;
}> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const targetFormat = options.format || "webp";
    let sharpInstance = sharp(buffer);

    if (options.type === "profile") {
      // Profil: 400x400 Kare Kesim
      sharpInstance = sharpInstance.resize(400, 400, {
        fit: "cover",
        position: "center",
      });
    } else {
      // Makale: Max 1200px Genişlik (Enboy oranını koru)
      const maxWidth = options.maxWidth || 1200;
      sharpInstance = sharpInstance.resize(maxWidth, options.maxHeight, {
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    if (targetFormat === "avif") {
      sharpInstance = sharpInstance.avif({ quality: 75, effort: 4 });
    } else {
      sharpInstance = sharpInstance.webp({ quality: 80, effort: 4 });
    }

    // İşlenmiş buffer'ı ve metadata'yı al
    const processedBuffer = await sharpInstance.toBuffer();
    const metadata = await sharp(processedBuffer).metadata();

    // Vercel Blob'a yükle
    const ext = targetFormat === "avif" ? "avif" : "webp";
    const contentType = targetFormat === "avif" ? "image/avif" : "image/webp";
    const filename = `${options.type}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}.${ext}`;

    const { url } = await put(filename, processedBuffer, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });

    return {
      success: true,
      url,
      width: metadata.width,
      height: metadata.height,
      size: processedBuffer.length,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Vercel Blob / Sharp yükleme hatası detayları:", error);
    return { success: false, error: `Görsel yüklenirken bir hata oluştu: ${message}` };
  }
}

/**
 * Vercel Blob üzerinden bir görseli siler.
 * @param url Silinecek görselin URL adresi
 */
export async function deleteOldImage(url: string | null | undefined) {
  if (!url || !url.includes("blob.vercel-storage.com")) return;

  try {
    await del(url);
  } catch (error) {
    console.warn(`Görsel silinemedi (Vercel Blob): ${url}`, error);
  }
}
