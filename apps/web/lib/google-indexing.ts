import "server-only";

import { google } from "googleapis";
import { appCache } from "./cache";

/**
 * Google Indexing API bildirimleri.
 * Haber yayınlandığında/güncellendiğinde URL_UPDATED, yayından kaldırıldığında ya da silindiğinde
 * URL_DELETED gönderilir. Son bildirimler Admin → Ayarlar → Sistem'de görünsün diye kısa süre saklanır.
 */

const LOG_KEY = "indexing:log";
const LOG_SIZE = 25;
const LOG_TTL_SECONDS = 30 * 86_400;

export type IndexingType = "URL_UPDATED" | "URL_DELETED";
export interface IndexingLogEntry {
  at: string;
  url: string;
  type: IndexingType;
  ok: boolean;
  error?: string;
}

/** Makalenin tam URL adresi */
export function getArticleUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/article/${slug}`;
}

export function isIndexingConfigured() {
  return !!process.env.GOOGLE_CLIENT_EMAIL && !!process.env.GOOGLE_PRIVATE_KEY;
}

async function authorizedClient() {
  const jwtClient = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    // Ortam değişkenindeki \n kaçışlarını gerçek satır sonuna çevir
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  await jwtClient.authorize();
  return google.indexing({ version: "v3", auth: jwtClient });
}

/** Google API hatasını yöneticinin anlayacağı kısa bir açıklamaya çevirir (anahtar içermez). */
function describeError(error: unknown) {
  const e = error as { code?: number; status?: number; message?: string };
  const status = e?.code ?? e?.status;
  const msg = e?.message ?? String(error);
  if (status === 403 || /permission|owner/i.test(msg)) return "Yetki yok: hizmet hesabı Search Console'da bu sitenin Sahibi olarak ekli değil ya da Indexing API etkin değil.";
  if (status === 429 || /quota/i.test(msg)) return "Günlük kota doldu (varsayılan 200 bildirim/gün).";
  if (/invalid_grant|private key|PEM|DECODER/i.test(msg)) return "Kimlik bilgisi geçersiz: GOOGLE_PRIVATE_KEY / GOOGLE_CLIENT_EMAIL hatalı.";
  return msg.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, "[gizli]").slice(0, 200);
}

async function record(entry: IndexingLogEntry) {
  try {
    const log = (await appCache.get<IndexingLogEntry[]>(LOG_KEY)) ?? [];
    await appCache.set(LOG_KEY, [entry, ...log].slice(0, LOG_SIZE), LOG_TTL_SECONDS);
  } catch {
    // Kayıt tutulamazsa bildirim yine de yapılmış olur
  }
}

/** Google'a URL bildirimi gönderir. Hata fırlatmaz; sonucu kaydeder. */
export async function notifyGoogle(url: string, type: IndexingType) {
  if (!isIndexingConfigured()) {
    console.warn("Google Indexing kimlik bilgileri yok (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY); bildirim atlandı.");
    return;
  }
  try {
    const api = await authorizedClient();
    const response = await api.urlNotifications.publish({ requestBody: { url, type } });
    await record({ at: new Date().toISOString(), url, type, ok: true });
    return response.data;
  } catch (error) {
    const message = describeError(error);
    console.error(`Google Indexing bildirimi başarısız (${type} ${url}):`, message);
    await record({ at: new Date().toISOString(), url, type, ok: false, error: message });
  }
}

export async function getIndexingLog() {
  return (await appCache.get<IndexingLogEntry[]>(LOG_KEY).catch(() => null)) ?? [];
}

/**
 * Bağlantı testi: kimlik doğrulaması ve Search Console sahipliği kontrol edilir.
 * Ana sayfa için bildirim kaydı sorgulanır (bildirim göndermez, kota harcamaz).
 */
export async function testIndexingAccess(): Promise<{ ok: boolean; message: string }> {
  if (!isIndexingConfigured()) return { ok: false, message: "GOOGLE_CLIENT_EMAIL ve GOOGLE_PRIVATE_KEY tanımlı değil." };
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/`;
  try {
    const api = await authorizedClient();
    await api.urlNotifications.getMetadata({ url });
    return { ok: true, message: "Bağlantı çalışıyor. Yayınlanan ve kaldırılan haberler Google'a otomatik bildiriliyor." };
  } catch (error) {
    const status = (error as { code?: number; status?: number })?.code ?? (error as { status?: number })?.status;
    // 404: bu adres için henüz bildirim yok, ama yetki ve kimlik doğrulaması tamam demektir
    if (status === 404) return { ok: true, message: "Bağlantı çalışıyor. Yayınlanan ve kaldırılan haberler Google'a otomatik bildiriliyor." };
    return { ok: false, message: describeError(error) };
  }
}
