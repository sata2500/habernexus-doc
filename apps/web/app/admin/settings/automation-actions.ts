"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getSafeActionError } from "@/lib/server/authz";
import { configureJob, getAutomationStatus, getSettingsRow, isQStashConfigured, type AutomationJob } from "@/lib/server/automation";
import { runAnalyzeJob, runScanJob } from "@/lib/server/jobs";
import { triggerBatchAiWriter } from "@/app/admin/rss-feeds/actions";
import { CronExpressionSchema } from "@/lib/validation/schemas";

const JobSchema = z.enum(["scan", "analyze", "writer", "newsletter"]);

const ContentRulesSchema = z.object({
  rssRetentionDays: z.number().int().min(1).max(365),
  maxNewsAgeHours: z.number().int().min(0).max(720),
  aiWriterAutoCount: z.number().int().min(1).max(10),
  googleTrendsEnabled: z.boolean(),
  googleTrendsGeo: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Geçerli bir ülke kodu girin."),
  trendAutoPublishThreshold: z.number().int().min(0).max(100),
  trendSearchGenerateEnabled: z.boolean(),
});

export type ContentRules = z.infer<typeof ContentRulesSchema>;

export async function getAutomationOverview() {
  await requireRole("ADMIN");
  const [jobs, s] = await Promise.all([getAutomationStatus(), getSettingsRow()]);
  const rules: ContentRules = {
    rssRetentionDays: s.rssRetentionDays,
    maxNewsAgeHours: s.maxNewsAgeHours,
    aiWriterAutoCount: s.aiWriterAutoCount,
    googleTrendsEnabled: s.googleTrendsEnabled,
    googleTrendsGeo: s.googleTrendsGeo,
    trendAutoPublishThreshold: s.trendAutoPublishThreshold,
    trendSearchGenerateEnabled: s.trendSearchGenerateEnabled,
  };
  return { qstash: isQStashConfigured(), jobs, rules };
}

export async function configureJobAction(job: AutomationJob, enabled: boolean, cron?: string) {
  await requireRole("ADMIN");
  const parsedJob = JobSchema.safeParse(job);
  if (!parsedJob.success) return { success: false as const, error: "Geçersiz iş." };
  if (cron !== undefined && !CronExpressionSchema.safeParse(cron).success) {
    return { success: false as const, error: "Geçersiz sıklık." };
  }
  try {
    await configureJob(parsedJob.data, enabled, cron);
    revalidatePath("/admin/settings");
    return { success: true as const, jobs: await getAutomationStatus() };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Zamanlama güncellenemedi." };
  }
}

export async function saveContentRules(input: ContentRules) {
  await requireRole("ADMIN");
  const parsed = ContentRulesSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Geçersiz değer." };
  try {
    await getSettingsRow();
    await prisma.systemSettings.update({ where: { id: "global" }, data: parsed.data });
    revalidatePath("/admin/settings");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getSafeActionError(error, "Kurallar kaydedilemedi.") };
  }
}

/** İşi beklemeden hemen çalıştırır ve kısa bir özet döner. */
export async function runJobNowAction(job: AutomationJob) {
  await requireRole("ADMIN");
  try {
    if (job === "scan") {
      const { scan, trends } = await runScanJob();
      const trendText = !trends ? "" : "error" in trends ? ` Trends hatası: ${trends.error}` : ` ${trends.synced} trend güncellendi, ${trends.boosted} öneri öne alındı.`;
      return { success: true as const, message: `${scan.total} kaynak tarandı, ${scan.totalAdded} yeni haber eklendi${scan.errors?.length ? `, ${scan.errors.length} kaynakta hata` : ""}.${trendText}` };
    }
    if (job === "analyze") {
      const { analysis, cleaned } = await runAnalyzeJob();
      if (analysis.error && !analysis.aiUsed) {
        return { success: false as const, error: `Yapay zekâ analizi yapılamadı: ${analysis.error}` };
      }
      return { success: true as const, message: `${analysis.analyzed} haber analiz edildi (${analysis.covered} tekrar, ${analysis.lowScore} düşük puan). ${cleaned} eski kayıt temizlendi.` };
    }
    if (job === "writer") {
      // Üretimde kuyruğa alınır (zaman aşımı olmaz), yerelde doğrudan yazılır
      const s = await getSettingsRow();
      const res = await triggerBatchAiWriter(s.aiWriterAutoCount);
      if (!res.success) return { success: false as const, error: res.error ?? "Haber yazılamadı." };
      if (res.mode === "async") {
        return { success: true as const, message: `${res.enqueued} haber kuyruğa alındı; birkaç dakika içinde yayınlanacak.` };
      }
      const results = (res.results ?? []) as { success: boolean; error?: string }[];
      const ok = results.filter((r) => r.success).length;
      return ok > 0
        ? { success: true as const, message: `${ok}/${results.length} haber yazıldı.` }
        : { success: false as const, error: results.find((r) => r.error)?.error ?? "Haber yazılamadı." };
    }
    return { success: false as const, error: "Bu iş elle çalıştırılamaz." };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "İş çalıştırılamadı." };
  }
}
