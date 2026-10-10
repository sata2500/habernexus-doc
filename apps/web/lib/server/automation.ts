import "server-only";
import { findOrCreate } from "@/lib/server/ensure-row";

import { Client } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/utils";

/**
 * Zamanlanmış işler (Upstash QStash) için tek merkez.
 * Ayar veritabanında, gerçek zamanlama QStash'te tutulur; durum her iki taraftan okunur.
 */

export type AutomationJob = "scan" | "analyze" | "writer" | "newsletter";

export const AUTOMATION_JOBS: Record<AutomationJob, { label: string; description: string; path: string; fixedCron?: string }> = {
  scan: {
    label: "RSS tarama ve Google Trends",
    description: "Kaynaklardan yeni haberleri çeker, aynı olayı anlatanları tek konuda toplar ve Google Trends ile eşleştirir.",
    path: "/api/cron/rss-scan",
  },
  analyze: {
    label: "Yapay zekâ ile haber analizi",
    description: "Yeni konuları değerlendirir: tekrar ve devam haberlerini ayırır, aciliyeti belirler, puanlar.",
    path: "/api/cron/rss-analyze",
  },
  writer: {
    label: "AI Yazar",
    description: "Karar Merkezi'ndeki yazım sırasından en öncelikli konuları yazar ve yayınlar.",
    path: "/api/cron/ai-writer",
  },
  newsletter: {
    label: "E-posta bülteni",
    description: "Her saat başı, o saati seçen abonelere günün haberlerini gönderir.",
    path: "/api/cron/newsletter",
    fixedCron: "0 * * * *",
  },
};

export interface JobStatus {
  job: AutomationJob;
  enabled: boolean;
  cron: string;
  /** QStash'te zamanlama gerçekten var mı (null: kontrol edilemedi) */
  live: boolean | null;
  paused: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastResult: "success" | "fail" | "running" | null;
}

type SettingsRow = NonNullable<Awaited<ReturnType<typeof prisma.systemSettings.findUnique>>>;

function jobFields(job: AutomationJob, s: SettingsRow) {
  switch (job) {
    case "scan": return { cron: s.rssScanCron, scheduleId: s.qStashScanId };
    case "analyze": return { cron: s.rssAnalyzeCron, scheduleId: s.qStashAnalyzeId };
    case "writer": return { cron: s.aiWriterAutoCron, scheduleId: s.qStashAiWriterId };
    case "newsletter": return { cron: AUTOMATION_JOBS.newsletter.fixedCron!, scheduleId: s.qStashNewsletterId };
  }
}

function idField(job: AutomationJob) {
  return ({ scan: "qStashScanId", analyze: "qStashAnalyzeId", writer: "qStashAiWriterId", newsletter: "qStashNewsletterId" } as const)[job];
}

function cronField(job: AutomationJob) {
  return ({ scan: "rssScanCron", analyze: "rssAnalyzeCron", writer: "aiWriterAutoCron", newsletter: null } as const)[job];
}

export function isQStashConfigured() {
  return !!process.env.QSTASH_TOKEN;
}

function qstash() {
  return new Client({ token: process.env.QSTASH_TOKEN || "" });
}

export async function getSettingsRow() {
  return findOrCreate(() => prisma.systemSettings.findUnique({ where: { id: "global" } }), () => prisma.systemSettings.create({ data: { id: "global" } }));
}

export async function getAutomationStatus(): Promise<JobStatus[]> {
  const settings = await getSettingsRow();
  const client = isQStashConfigured() ? qstash() : null;

  return Promise.all((Object.keys(AUTOMATION_JOBS) as AutomationJob[]).map(async (job) => {
    const { cron, scheduleId } = jobFields(job, settings);
    const base: JobStatus = {
      job,
      enabled: !!scheduleId && (job !== "writer" || settings.aiWriterAutoEnabled),
      cron,
      live: null,
      paused: false,
      lastRunAt: null,
      nextRunAt: null,
      lastResult: null,
    };
    if (!scheduleId || !client) return { ...base, live: scheduleId ? null : false };
    try {
      const schedule = await client.schedules.get(scheduleId);
      const states = Object.values(schedule.lastScheduleStates ?? {});
      return {
        ...base,
        live: true,
        paused: !!schedule.isPaused,
        cron: schedule.cron || cron,
        lastRunAt: schedule.lastScheduleTime ? new Date(schedule.lastScheduleTime).toISOString() : null,
        nextRunAt: schedule.nextScheduleTime ? new Date(schedule.nextScheduleTime).toISOString() : null,
        lastResult: states.includes("FAIL") ? "fail" : states.includes("IN_PROGRESS") ? "running" : states.length ? "success" : null,
      };
    } catch (error) {
      // Zamanlama QStash'te silinmiş olabilir
      console.warn(`[Automation] ${job} zamanlaması okunamadı:`, error instanceof Error ? error.message : error);
      return { ...base, live: false };
    }
  }));
}

/**
 * Bir işi açar/kapatır veya sıklığını değiştirir. Eski QStash zamanlaması her zaman silinir,
 * açıksa yenisi oluşturulur; böylece veritabanı ile QStash hiçbir zaman ayrışmaz.
 */
export async function configureJob(job: AutomationJob, enabled: boolean, cron?: string) {
  const settings = await getSettingsRow();
  const { scheduleId, cron: currentCron } = jobFields(job, settings);
  const nextCron = AUTOMATION_JOBS[job].fixedCron ?? cron ?? currentCron;

  if (enabled && !isQStashConfigured()) {
    throw new Error("QSTASH_TOKEN tanımlı değil; zamanlanmış işler için Upstash QStash gerekli.");
  }

  const client = isQStashConfigured() ? qstash() : null;
  if (scheduleId && client) {
    await client.schedules.delete(scheduleId).catch((e) => console.warn(`[Automation] eski ${job} zamanlaması silinemedi:`, e));
  }

  let newId: string | null = null;
  if (enabled && client) {
    const created = await client.schedules.create({
      destination: `${getAppUrl()}${AUTOMATION_JOBS[job].path}`,
      cron: nextCron,
    });
    newId = created.scheduleId;
  }

  const data: Record<string, unknown> = { [idField(job)]: newId };
  const cf = cronField(job);
  if (cf) data[cf] = nextCron;
  if (job === "writer") data.aiWriterAutoEnabled = enabled;
  await prisma.systemSettings.update({ where: { id: "global" }, data });
}
