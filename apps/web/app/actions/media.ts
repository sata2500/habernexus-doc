"use server";

import { processAndSaveImage, UploadType } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Genel görsel yükleme aksiyonu
 * @param formData Dosyayı ve türü içeren form verisi
 */
export async function uploadImage(formData: FormData) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    return { success: false, error: "Görsel yüklemek için giriş yapmalısınız." };
  }

  const file = formData.get("file") as File;
  const type = formData.get("type") as UploadType;

  if (!file) {
    return { success: false, error: "Dosya seçilmedi." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Dosya boyutu 5MB'dan büyük olamaz." };
  }

  const result = await processAndSaveImage(file, { type });

  return result;
}
