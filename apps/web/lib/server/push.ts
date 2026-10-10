import "server-only";
import { findOrCreate } from "@/lib/server/ensure-row";

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { appCache } from "@/lib/cache";
import { getAppUrl, SITE_TIME_ZONE } from "@/lib/utils";

/**
 * Tarayıcı bildirimleri (Web Push, VAPID). Anahtarlar Vercel ortam değişkenlerindedir:
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (ve isteğe bağlı VAPID_SUBJECT).
 * Okuru sıkmamak için: günlük üst sınır, sessiz saatler ve aynı haber için tek bildirim.
 */

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export function isPushConfigured() {
  return !!(VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureVapid() {
  if (configured) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@habernexus.com", VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
  return true;
}

export async function getNotificationSettings() {
  return findOrCreate(() => prisma.notificationSettings.findUnique({ where: { id: "global" } }), () => prisma.notificationSettings.create({ data: { id: "global" } }));
}

/** Türkiye saatiyle saat (0-23) */
function siteHour(now: Date) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: SITE_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(now));
}

/** Sessiz saatlerde mi? (başlangıç gece yarısını geçebilir: 23 → 7) */
export function inQuietHours(hour: number, start: number, end: number) {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Türkiye saatine göre bugünün başlangıcı */
function startOfSiteDay(now: Date) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  // Türkiye UTC+3 (yaz saati yok)
  return new Date(`${day}T00:00:00+03:00`);
}

export type PushBlock = "not-configured" | "disabled" | "quiet-hours" | "daily-limit" | "already-sent" | null;

/** Gönderim yapılabilir mi? (elle gönderimde sessiz saat uyarısı yöneticinin kararına bırakılır) */
export async function pushBlockReason(articleId: string | null, opts: { automatic: boolean; now?: Date }): Promise<PushBlock> {
  const now = opts.now ?? new Date();
  if (!isPushConfigured()) return "not-configured";
  const settings = await getNotificationSettings();
  if (!settings.enabled) return "disabled";
  if (opts.automatic && inQuietHours(siteHour(now), settings.quietStartHour, settings.quietEndHour)) return "quiet-hours";
  const sentToday = await prisma.pushLog.count({ where: { sentAt: { gte: startOfSiteDay(now) } } });
  if (sentToday >= settings.dailyLimit) return "daily-limit";
  if (articleId && (await prisma.pushLog.count({ where: { articleId } })) > 0) return "already-sent";
  return null;
}

export const PUSH_BLOCK_TEXT: Record<Exclude<PushBlock, null>, string> = {
  "not-configured": "Bildirim anahtarları (VAPID) tanımlı değil.",
  disabled: "Bildirimler ayarlardan kapalı.",
  "quiet-hours": "Sessiz saatlerdeyiz; otomatik bildirim gönderilmez.",
  "daily-limit": "Bugünkü bildirim sınırına ulaşıldı.",
  "already-sent": "Bu haber için daha önce bildirim gönderildi.",
};

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  image?: string | null;
  tag?: string;
}

/**
 * Tüm abonelere gönderir. Geçersiz abonelikler (410/404) silinir; art arda 5 kez başarısız olanlar da.
 * Aynı anda yalnızca bir gönderim çalışır.
 */
export async function broadcastPush(payload: PushPayload, meta: { articleId: string | null; automatic: boolean }) {
  if (!ensureVapid()) return { recipients: 0, delivered: 0, failed: 0 };
  if (!(await appCache.claim("push:broadcast-lock", 300))) throw new Error("Başka bir bildirim gönderimi sürüyor.");

  const log = await prisma.pushLog.create({
    data: { articleId: meta.articleId, title: payload.title, body: payload.body, url: payload.url, automatic: meta.automatic },
  });
  const message = JSON.stringify({ ...payload, url: withUtm(payload.url) });
  let delivered = 0;
  let failed = 0;
  let recipients = 0;
  let cursor: string | undefined;

  try {
    for (;;) {
      const batch = await prisma.pushSubscription.findMany({
        take: 200,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        orderBy: { id: "asc" },
        select: { id: true, endpoint: true, p256dh: true, auth: true, failureCount: true },
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;
      recipients += batch.length;

      // 20'li gruplar hâlinde paralel gönderim
      for (let i = 0; i < batch.length; i += 20) {
        await Promise.all(batch.slice(i, i + 20).map(async (sub) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message, { TTL: 6 * 3600, urgency: "high" });
            delivered++;
            await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastSuccessAt: new Date(), failureCount: 0 } }).catch(() => {});
          } catch (error) {
            failed++;
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410 || sub.failureCount >= 4) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            } else {
              await prisma.pushSubscription.update({ where: { id: sub.id }, data: { failureCount: { increment: 1 } } }).catch(() => {});
            }
          }
        }));
      }
    }
  } finally {
    await prisma.pushLog.update({ where: { id: log.id }, data: { recipients, delivered, failed } }).catch(() => {});
    await appCache.invalidate("push:broadcast-lock");
  }
  return { recipients, delivered, failed };
}

function withUtm(path: string) {
  const url = new URL(path, getAppUrl());
  url.searchParams.set("utm_source", "bildirim");
  url.searchParams.set("utm_medium", "push");
  return url.pathname + url.search;
}

/** Haber için bildirim içeriği */
export function articlePayload(article: { id: string; title: string; slug: string; coverImage: string | null }, siteName: string): PushPayload {
  return {
    title: siteName,
    body: article.title.slice(0, 180),
    url: `/article/${article.slug}`,
    image: article.coverImage,
    tag: `article-${article.id}`,
  };
}

/**
 * Yapay zekâ hattında "son dakika" değerlendirilen haber yayımlanınca (ayar açıksa) otomatik bildirim.
 * Sınırlar (sessiz saat, günlük sınır, tek bildirim) geçerlidir; hata yayını etkilemez.
 */
export async function maybeAutoPushArticle(articleId: string) {
  try {
    if (!isPushConfigured()) return;
    const settings = await getNotificationSettings();
    if (!settings.enabled || !settings.autoBreaking) return;
    const story = await prisma.newsStory.findFirst({ where: { articleId, urgency: "BREAKING" }, select: { id: true } });
    if (!story) return;
    if (await pushBlockReason(articleId, { automatic: true })) return;
    const article = await prisma.article.findFirst({
      where: { id: articleId, status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, coverImage: true },
    });
    if (!article) return;
    const site = await prisma.siteSettings.findUnique({ where: { id: "global" }, select: { siteName: true } });
    await broadcastPush(articlePayload(article, site?.siteName || "Haber Nexus"), { articleId, automatic: true });
  } catch (error) {
    console.error("[Bildirim] Otomatik gönderim başarısız:", error);
  }
}
