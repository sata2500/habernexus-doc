import "server-only";

import { scanAllActiveSources } from "@/lib/rss-scanner";
import { cleanupOldItems } from "@/lib/ai-analyzer";
import { syncGoogleTrends } from "@/lib/google-trends";
import { analyzeStories, cleanupStories, clusterNewItems, matchTrendsToStories, rescoreStories } from "@/lib/news/stories";
import { prisma } from "@/lib/prisma";

/**
 * Zamanlanmış işlerin gövdeleri. Hem QStash cron uç noktaları hem de admin panelindeki
 * "Şimdi çalıştır" düğmeleri aynı fonksiyonları kullanır.
 *
 * Tarama:  kaynakları tara → haberleri konulara kümele → Google Trends → eşleştir → puanla
 * Analiz:  yeni konuları yapay zekâyla değerlendir → puanla → eski kayıtları temizle
 */

export async function runScanJob() {
  const scan = await scanAllActiveSources();
  const cluster = await clusterNewItems();

  // Google Trends açıksa trendleri güncelle (hata taramayı bozmaz)
  let trends: { synced: number; matched: number } | { error: string } | null = null;
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" }, select: { googleTrendsEnabled: true } });
  if (settings?.googleTrendsEnabled !== false) {
    try {
      const sync = await syncGoogleTrends();
      const match = await matchTrendsToStories();
      trends = { synced: sync.synced, matched: match.matched };
    } catch (error) {
      trends = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  const scoring = await rescoreStories();
  return { scan, cluster, trends, scoring };
}

/** Bir çağrıda en fazla birkaç parti analiz edilir; süre sınırına takılmamak için zamanı izler. */
export async function runAnalyzeJob({ budgetMs = 200_000, maxBatches = 4 } = {}) {
  const started = Date.now();
  await clusterNewItems();
  const total = { analyzed: 0, duplicates: 0, merged: 0, ready: 0, aiUsed: false, error: undefined as string | undefined };
  for (let i = 0; i < maxBatches && Date.now() - started < budgetMs; i++) {
    const r = await analyzeStories();
    total.analyzed += r.analyzed;
    total.duplicates += r.duplicates;
    total.merged += r.merged;
    total.ready += r.ready;
    total.aiUsed ||= r.aiUsed;
    total.error = r.error ?? total.error;
    if (r.analyzed === 0 || !r.aiUsed) break;
  }
  await matchTrendsToStories().catch((e) => console.warn("[Jobs] Trend eşleştirme hatası:", e));
  const scoring = await rescoreStories();

  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" }, select: { rssRetentionDays: true } });
  const cleanedItems = await cleanupOldItems();
  const cleaned = await cleanupStories(settings?.rssRetentionDays ?? 14);
  return { analysis: total, scoring, cleaned: { items: cleanedItems, ...cleaned } };
}
