import { put, del } from "@vercel/blob";
import sharp from "sharp";

export type UploadType = "profile" | "article";

interface UploadOptions {
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Görseli işler (isteğe bağlı) ve Vercel Blob üzerine kaydeder.
 */
export async function processAndSaveImage(
  file: File,
  options: UploadOptions
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);

    // Sharp ile işle (WebP dönüşümü ve Boyutlandırma)
    let sharpInstance = sharp(buffer).webp({ quality: 80 });

    if (options.type === "profile") {
      // Profil: 400x400 Kare Kesim
      sharpInstance = sharpInstance.resize(400, 400, {
        fit: "cover",
        position: "center",
      });
    } else {
      // Makale: Max 1200px Genişlik (Enboy oranını koru)
      sharpInstance = sharpInstance.resize(1200, undefined, {
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    // İşlenmiş buffer'ı al
    const processedBuffer = await sharpInstance.toBuffer();

    // Vercel Blob'a yükle
    const filename = `${options.type}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}.webp`;
    
    const { url } = await put(filename, processedBuffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/webp",
    });

    return { success: true, url };
  } catch (error) {
    console.error("Vercel Blob yükleme hatası:", error);
    return { success: false, error: "Görsel yüklenirken bir hata oluştu." };
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
