"use server";

import webpush from "web-push";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminOnly, requireRole } from "@/lib/server/authz";
import {
  articlePayload,
  broadcastPush,
  getNotificationSettings,
  isPushConfigured,
  PUSH_BLOCK_TEXT,
  pushBlockReason,
} from "@/lib/server/push";
import { getSiteSettings } from "@/lib/site-settings";
import type { ActionResult } from "@/lib/types";

export async function getNotificationOverview() {
  await requireRole("ADMIN");
  const [settings, subscribers, logs] = await Promise.all([
    getNotificationSettings(),
    prisma.pushSubscription.count(),
    prisma.pushLog.findMany({ orderBy: { sentAt: "desc" }, take: 20 }),
  ]);
  return {
    configured: isPushConfigured(),
    settings: {
      enabled: settings.enabled,
      autoBreaking: settings.autoBreaking,
      dailyLimit: settings.dailyLimit,
      quietStartHour: settings.quietStartHour,
      quietEndHour: settings.quietEndHour,
    },
    subscribers,
    logs,
  };
}

const SettingsSchema = z.object({
  enabled: z.boolean(),
  autoBreaking: z.boolean(),
  dailyLimit: z.number().int().min(1, "Günlük sınır en az 1 olmalı.").max(10, "Günde 10'dan fazla bildirim okuru rahatsız eder."),
  quietStartHour: z.number().int().min(0).max(23),
  quietEndHour: z.number().int().min(0).max(23),
});

export async function updateNotificationSettings(input: z.input<typeof SettingsSchema>): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz ayar." };
  await prisma.notificationSettings.upsert({ where: { id: "global" }, create: { id: "global", ...parsed.data }, update: parsed.data });
  return { success: true };
}

/** Bildirim için haber seçimi: son yayınlananlar ya da başlıkta arama */
export async function findArticlesForPush(q: string) {
  await requireRole("ADMIN");
  const term = typeof q === "string" ? q.trim().slice(0, 100) : "";
  return prisma.article.findMany({
    where: { status: "PUBLISHED", ...(term && { title: { contains: term, mode: "insensitive" as const } }) },
    orderBy: { publishedAt: "desc" },
    take: 8,
    select: { id: true, title: true, slug: true, publishedAt: true },
  });
}

/** Seçilen haber için tüm abonelere bildirim (günlük sınır ve tek bildirim kuralı geçerli) */
export async function sendArticlePush(articleId: string): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;
  if (typeof articleId !== "string" || !articleId) return { success: false, error: "Bir haber seçin." };
  const block = await pushBlockReason(articleId, { automatic: false });
  if (block) return { success: false, error: PUSH_BLOCK_TEXT[block] };
  const article = await prisma.article.findFirst({
    where: { id: articleId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, coverImage: true },
  });
  if (!article) return { success: false, error: "Haber bulunamadı ya da yayında değil." };
  try {
    const site = await getSiteSettings();
    const r = await broadcastPush(articlePayload(article, site.siteName || "Haber Nexus"), { articleId, automatic: false });
    return { success: true, message: `${r.recipients} aboneye gönderildi: ${r.delivered} başarılı, ${r.failed} başarısız.` };
  } catch (error) {
    console.error("[Bildirim] Gönderim hatası:", error);
    return { success: false, error: error instanceof Error && error.message.startsWith("Başka bir") ? error.message : "Bildirim gönderilemedi." };
  }
}

/**
 * Yeni VAPID anahtar çifti üretir (kaydedilmez). Yönetici bunları Vercel ortam değişkenlerine girer.
 * Anahtarlar bir kez belirlendikten sonra değiştirilmemelidir: değişirse mevcut abonelikler geçersizleşir.
 */
export async function generateVapidKeys(): Promise<ActionResult<{ publicKey: string; privateKey: string }>> {
  const denied = await adminOnly();
  if (denied) return denied;
  const keys = webpush.generateVAPIDKeys();
  return { success: true, data: keys };
}
