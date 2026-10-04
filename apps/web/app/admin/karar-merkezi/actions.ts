"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getSafeActionError } from "@/lib/server/authz";
import { scanRssSource } from "@/lib/rss-scanner";
import { runAnalyzeJob, runScanJob } from "@/lib/server/jobs";
import { clusterNewItems, getWritingQueue, rescoreStories } from "@/lib/news/stories";
import { describeDispatch, dispatchStories } from "@/lib/news/dispatch";
import { writeTrendArticle } from "@/lib/news/trend-writer";
import { RssSourceIdSchema, RssSourceSchema, RssSourceUpdateSchema } from "@/lib/validation/schemas";

const BASE = "/admin/karar-merkezi";
const IdSchema = z.string().trim().min(1).max(100);
type Result = { success: true; message: string } | { success: false; error: string };

const assertAdmin = () => requireRole("ADMIN");
const refresh = () => revalidatePath(BASE);

// ── Boru hattı ─────────────────────────────────────────────

/** Kaynakları tarar, konulara ayırır ve yeni konuları hemen analiz eder. */
export async function runPipelineNow(): Promise<Result> {
  await assertAdmin();
  try {
    const { scan, cluster, trends } = await runScanJob();
    const { analysis } = await runAnalyzeJob({ budgetMs: 90_000, maxBatches: 3 });
    refresh();
    const trendText = trends && "synced" in trends ? ` ${trends.synced} trend güncellendi.` : trends && "error" in trends ? ` Trends hatası: ${trends.error}` : "";
    const aiText = analysis.aiUsed ? "" : analysis.error ? ` Yapay zekâ kullanılamadı (${analysis.error}); kural tabanlı değerlendirildi.` : "";
    return {
      success: true,
      message: `${scan.total} kaynak tarandı, ${scan.totalAdded} yeni haber. ${cluster.created} yeni konu, ${cluster.assigned} haber mevcut konulara eklendi. ${analysis.analyzed} konu analiz edildi (${analysis.duplicates} tekrar, ${analysis.merged} birleşme).${trendText}${aiText}`,
    };
  } catch (error) {
    return { success: false, error: getSafeActionError(error, "İşlem tamamlanamadı.") };
  }
}

/** Sıradaki en yüksek öncelikli konuları yazdırır. */
export async function writeNextNow(count: number): Promise<Result> {
  await assertAdmin();
  const n = z.number().int().min(1).max(5).safeParse(count);
  if (!n.success) return { success: false, error: "Geçersiz sayı." };
  try {
    await rescoreStories();
    const queue = await getWritingQueue(n.data);
    const r = await dispatchStories(queue.map((q) => q.id));
    refresh();
    return r.mode === "sync" && r.written === 0 && r.failed > 0 ? { success: false, error: describeDispatch(r) } : { success: true, message: describeDispatch(r) };
  } catch (error) {
    return { success: false, error: getSafeActionError(error, "Yazım başlatılamadı.") };
  }
}

// ── Konu işlemleri ─────────────────────────────────────────

export async function writeStoryNow(id: string): Promise<Result> {
  await assertAdmin();
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "Geçersiz konu." };
  // Elle seçilen konu eşiğin altında olsa da yazılabilir; tekrar ve süresi dolmuş kontrolleri yine uygulanır
  await prisma.newsStory.updateMany({ where: { id: parsed.data, status: { in: ["NEW", "FAILED"] } }, data: { status: "READY", attempts: 0 } });
  const r = await dispatchStories([parsed.data]);
  refresh();
  if (r.mode === "sync" && r.failed > 0) return { success: false, error: r.errors[0] };
  return { success: true, message: describeDispatch(r) };
}

export async function setStoryPinned(id: string, pinned: boolean): Promise<Result> {
  await assertAdmin();
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "Geçersiz konu." };
  await prisma.newsStory.updateMany({ where: { id: parsed.data, status: { in: ["NEW", "READY"] } }, data: { pinned, ...(pinned && { status: "READY" }) } });
  refresh();
  return { success: true, message: pinned ? "Konu sıranın başına alındı." : "Öncelik kaldırıldı." };
}

export async function dismissStory(id: string): Promise<Result> {
  await assertAdmin();
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "Geçersiz konu." };
  await prisma.newsStory.updateMany({
    where: { id: parsed.data, status: { in: ["NEW", "READY", "FAILED"] } },
    data: { status: "DISMISSED", pinned: false, score: 0, reason: "Editör tarafından elendi" },
  });
  refresh();
  return { success: true, message: "Konu elendi." };
}

/** Elenen bir konuyu yeniden değerlendirmeye alır (24 saat ek süre verilir). */
export async function restoreStory(id: string): Promise<Result> {
  await assertAdmin();
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: "Geçersiz konu." };
  await prisma.newsStory.updateMany({
    where: { id: parsed.data, status: { in: ["DISMISSED", "LOW_SCORE", "EXPIRED", "DUPLICATE", "FAILED"] } },
    data: { status: "READY", attempts: 0, duplicateArticleId: null, reason: "Editör geri aldı", expiresAt: new Date(Date.now() + 24 * 3_600_000), lastError: null },
  });
  await rescoreStories();
  refresh();
  return { success: true, message: "Konu yeniden değerlendirmeye alındı." };
}

export async function writeTrendNow(trendId: string): Promise<Result> {
  await assertAdmin();
  const parsed = IdSchema.safeParse(trendId);
  if (!parsed.success) return { success: false, error: "Geçersiz trend." };
  const r = await writeTrendArticle(parsed.data);
  refresh();
  revalidatePath("/");
  return r.success ? { success: true, message: `Yayınlandı: ${r.title}` } : { success: false, error: r.error };
}

// ── Kaynaklar ──────────────────────────────────────────────

export async function getRssSources() {
  await assertAdmin();
  return prisma.rssFeedSource.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } });
}

export async function createRssSource(data: { name: string; url: string; categoryHint?: string; language?: string }) {
  await assertAdmin();
  const parsed = RssSourceSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Geçersiz RSS kaynağı." };
  try {
    await prisma.rssFeedSource.create({
      data: { name: parsed.data.name, url: parsed.data.url, categoryHint: parsed.data.categoryHint || null, language: parsed.data.language },
    });
    refresh();
    return { success: true };
  } catch {
    return { success: false, error: "Bu URL zaten kayıtlı veya bir hata oluştu." };
  }
}

export async function updateRssSource(id: string, data: { isActive?: boolean; name?: string; categoryHint?: string }) {
  await assertAdmin();
  const parsedId = RssSourceIdSchema.safeParse(id);
  const parsedData = RssSourceUpdateSchema.safeParse(data);
  if (!parsedId.success || !parsedData.success) return { success: false, error: "Geçersiz RSS kaynağı verisi." };
  await prisma.rssFeedSource.update({ where: { id: parsedId.data }, data: parsedData.data });
  refresh();
  return { success: true };
}

export async function deleteRssSource(id: string) {
  await assertAdmin();
  const parsedId = RssSourceIdSchema.safeParse(id);
  if (!parsedId.success) return { success: false, error: "Geçersiz RSS kaynağı." };
  await prisma.rssFeedSource.delete({ where: { id: parsedId.data } });
  refresh();
  return { success: true };
}

/** Tek kaynağı (ya da kaynak verilmezse hepsini) tarar ve yeni haberleri konulara ekler. */
export async function triggerRssScan(sourceId?: string) {
  await assertAdmin();
  const parsedId = sourceId ? RssSourceIdSchema.safeParse(sourceId) : null;
  if (parsedId && !parsedId.success) return { success: false, error: "Geçersiz RSS kaynağı." };
  try {
    if (parsedId?.success) {
      const source = await prisma.rssFeedSource.findUnique({ where: { id: parsedId.data }, select: { id: true, url: true } });
      if (!source) return { success: false, error: "Kaynak bulunamadı." };
      const result = await scanRssSource(source.id, source.url);
      await clusterNewItems();
      refresh();
      return { success: true, ...result };
    }
    const { scan } = await runScanJob();
    refresh();
    return { success: true, ...scan };
  } catch (err) {
    return { success: false, error: getSafeActionError(err, "RSS işlemi gerçekleştirilemedi.") };
  }
}
