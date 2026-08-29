"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Client } from "@upstash/qstash";
import { getAppUrl } from "@/lib/utils";
import { requireRole } from "@/lib/server/authz";
import { CronExpressionSchema, RssRetentionDaysSchema } from "@/lib/validation/schemas";

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "dummy" });
const APP_URL = getAppUrl();

// QStash API Key'in tanımlı olup olmadığını kontrol et
const QSTASH_ENABLED = !!process.env.QSTASH_TOKEN;

export async function getSystemSettings() {
  await requireRole("ADMIN");
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "global" },
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: "global" },
    });
  }

  return settings;
}

export async function updateCronSchedule(type: "scan" | "analyze", cronExpression: string) {
  await requireRole("ADMIN");
  const parsedCron = CronExpressionSchema.safeParse(cronExpression);
  if (!parsedCron.success) return { success: false, error: "Geçersiz cron ifadesi." };
  if (!QSTASH_ENABLED) {
    return { success: false, error: "QSTASH_TOKEN tanımlı değil. Lütfen Upstash hesabınızı bağlayın." };
  }

  try {
    const settings = await getSystemSettings();
    const endpoint = `${APP_URL}/api/cron/rss-${type}`;

    // Eski zamanlamayı QStash'ten sil
    const oldScheduleId = type === "scan" ? settings.qStashScanId : settings.qStashAnalyzeId;
    if (oldScheduleId) {
      try {
        await qstashClient.schedules.delete(oldScheduleId);
      } catch (err) {
        console.error("Eski QStash schedule silinirken hata:", err);
      }
    }

    // Yeni zamanlamayı QStash'te oluştur
    const schedule = await qstashClient.schedules.create({
      destination: endpoint,
      cron: parsedCron.data,
    });

    // Veritabanını güncelle
    if (type === "scan") {
      await prisma.systemSettings.update({
        where: { id: "global" },
        data: { rssScanCron: parsedCron.data, qStashScanId: schedule.scheduleId },
      });
    } else {
      await prisma.systemSettings.update({
        where: { id: "global" },
        data: { rssAnalyzeCron: parsedCron.data, qStashAnalyzeId: schedule.scheduleId },
      });
    }

    revalidatePath("/admin/rss-feeds");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function setupNewsletterCron() {
  await requireRole("ADMIN");
  if (!QSTASH_ENABLED) {
    return { success: false, error: "QSTASH_TOKEN tanımlı değil." };
  }

  try {
    const settings = await getSystemSettings();
    const endpoint = `${APP_URL}/api/cron/newsletter`;

    // Eski zamanlamayı sil (varsa)
    if (settings.qStashNewsletterId) {
      try {
        await qstashClient.schedules.delete(settings.qStashNewsletterId);
      } catch (err) {
        console.error("Eski bülten QStash schedule silinirken hata:", err);
      }
    }

    // Yeni zamanlamayı oluştur (Her saat başı)
    const schedule = await qstashClient.schedules.create({
      destination: endpoint,
      cron: "0 * * * *",
    });

    await prisma.systemSettings.update({
      where: { id: "global" },
      data: { qStashNewsletterId: schedule.scheduleId },
    });

    revalidatePath("/admin/rss-feeds");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateRssRetention(days: number) {
  await requireRole("ADMIN");
  const parsedDays = RssRetentionDaysSchema.safeParse(days);
  if (!parsedDays.success) return { success: false, error: "Saklama süresi 1 ile 365 gün arasında olmalıdır." };
  try {
    await prisma.systemSettings.update({
      where: { id: "global" },
      data: { rssRetentionDays: parsedDays.data },
    });
    revalidatePath("/admin/rss-feeds");
    return { success: true };
  } catch (err) {
    console.error("Error updating retention:", err);
    return { success: false, error: String(err) };
  }
}
