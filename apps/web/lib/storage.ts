import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_BASE_DIR = path.join(process.cwd(), "public/uploads");

export type UploadType = "profile" | "article";

interface UploadOptions {
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
}

export async function processAndSaveImage(
  file: File,
  options: UploadOptions
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dizinleri oluştur
    const targetDir = path.join(UPLOAD_BASE_DIR, options.type === "profile" ? "profiles" : "articles");
    await fs.mkdir(targetDir, { recursive: true });

    // Benzersiz dosya adı oluştur (.webp formatında)
    const fileName = `${crypto.randomUUID()}.webp`;
    const filePath = path.join(targetDir, fileName);

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

    await sharpInstance.toFile(filePath);

    // Public URL döndür
    const publicUrl = `/uploads/${options.type === "profile" ? "profiles" : "articles"}/${fileName}`;

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Görsel işleme hatası:", error);
    return { success: false, error: "Görsel işlenirken bir hata oluştu." };
  }
}

/**
 * Eski bir görseli siler (yer açmak için)
 * @param url Silinecek görselin URL adresi
 */
export async function deleteOldImage(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  
  try {
    const absolutePath = path.join(process.cwd(), "public", url);
    await fs.unlink(absolutePath);
  } catch (error) {
    // Dosya yoksa veya silinemezse sessizce devam et
    console.warn(`Görsel silinemedi: ${url}`, error);
  }
}
