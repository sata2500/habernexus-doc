import { google } from "googleapis";

/**
 * Makalenin tam URL adresini oluşturan yardımcı fonksiyon.
 */
export function getArticleUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/article/${slug}`;
}

/**
 * Google Indexing API üzerinden URL güncelleme veya silme bildirimi gönderir.
 * 
 * @param url Bildirilecek tam URL adresi
 * @param type İşlem türü ('URL_UPDATED' veya 'URL_DELETED')
 */
export async function notifyGoogle(url: string, type: "URL_UPDATED" | "URL_DELETED") {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.warn("Google Indexing credentials missing (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY). Skipping notification.");
    return;
  }

  // Özel anahtardaki ters bölü n (\n) kaçış karakterlerini gerçek satır sonlarına çevir
  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    const jwtClient = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    // JWT yetkilendirmesi yap
    await jwtClient.authorize();

    // API çağrısını gerçekleştir
    const response = await google.indexing({
      version: "v3",
      auth: jwtClient,
    }).urlNotifications.publish({
      requestBody: {
        url,
        type,
      },
    });

    console.log(`Successfully notified Google Indexing API for ${url} (type: ${type})`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Failed to notify Google Indexing API for ${url}:`, error);
  }
}
