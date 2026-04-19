"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Client } from "@upstash/qstash";

const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "dummy" });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com";

// QStash API Key'in tanımlı olup olmadığını kontrol et
const QSTASH_ENABLED = !!process.env.QSTASH_TOKEN;

export async function getSystemSettings() {
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
      cron: cronExpression,
    });

    // Veritabanını güncelle
    if (type === "scan") {
      await prisma.systemSettings.update({
        where: { id: "global" },
        data: { rssScanCron: cronExpression, qStashScanId: schedule.scheduleId },
      });
    } else {
      await prisma.systemSettings.update({
        where: { id: "global" },
        data: { rssAnalyzeCron: cronExpression, qStashAnalyzeId: schedule.scheduleId },
      });
    }

    revalidatePath("/admin/rss-feeds");
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
