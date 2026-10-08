import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { SITE_TIME_ZONE } from "@/lib/utils";

/** Arama motoru botları, önizleme servisleri ve otomatik araçlar sayılmaz */
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|embedly|curl|wget|python|headless|lighthouse|pagespeed|monitor|uptime/i;

export function isBotUserAgent(ua: string | null | undefined) {
  return !ua || ua.length < 20 || BOT_UA.test(ua);
}

/** Türkiye saatine göre gün (YYYY-MM-DD) */
function siteDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * Kişi + haber + gün için tek yönlü özet. Kişi: giriş yapmışsa hesap, değilse IP + tarayıcı.
 * Gizli anahtarla (HMAC) üretildiği için özetten IP ya da kimlik geri elde edilemez; gün değişince özet de değişir.
 */
export function viewMarkId(articleId: string, visitor: string, now = new Date()) {
  const secret = process.env.BETTER_AUTH_SECRET || "habernexus-view-salt";
  return createHmac("sha256", secret).update(`${siteDay(now)}|${articleId}|${visitor}`).digest("base64url");
}

/**
 * Görüntülenmeyi kaydeder: aynı kişi aynı haberi günde yalnızca bir kez sayılır.
 * Tekilleştirme veritabanında yapıldığı için sunucu örnekleri arasında da tutarlıdır.
 * Dönen değer: sayıldıysa true.
 */
export async function recordUniqueView(articleId: string, visitor: string) {
  const id = viewMarkId(articleId, visitor);
  const inserted = await prisma.$executeRaw`INSERT INTO "ArticleViewMark" ("id") VALUES (${id}) ON CONFLICT ("id") DO NOTHING`;
  if (inserted === 0) return false;
  // Ham SQL: @updatedAt (Google'a bildirilen değişiklik tarihi) görüntülenmeyle değişmesin
  await prisma.$executeRaw`UPDATE "Article" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${articleId} AND "status" = 'PUBLISHED'`;
  return true;
}
