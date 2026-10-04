import "server-only";

import { scanAllActiveSources } from "@/lib/rss-scanner";
import { analyzeRssBatch, cleanupOldItems } from "@/lib/ai-analyzer";
import { matchTrendsWithRss, syncGoogleTrends } from "@/lib/google-trends";
import { prisma } from "@/lib/prisma";

/**
 * Zamanlanmış işlerin gövdeleri. Hem QStash cron uç noktaları hem de admin panelindeki
 * "Şimdi çalıştır" düğmeleri aynı fonksiyonları kullanır.
 */

export async function runScanJob() {
  const scan = await scanAllActiveSources();

  // Google Trends açıksa trendleri güncelle ve yeni haberlerle eşleştir (hata taramayı bozmaz)
  let trends: { synced: number; matched: number; boosted: number } | { error: string } | null = null;
  const settings = await prisma.systemSettings.findUnique({ where: { id: "global" }, select: { googleTrendsEnabled: true } });
  if (settings?.googleTrendsEnabled !== false) {
    try {
      const sync = await syncGoogleTrends();
      const match = await matchTrendsWithRss();
      trends = { synced: sync.synced, matched: match.matched, boosted: match.autoPublishCount };
    } catch (error) {
      trends = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  return { scan, trends };
}

export async function runAnalyzeJob() {
  const analysis = await analyzeRssBatch();
  const cleaned = await cleanupOldItems();
  return { analysis, cleaned };
}
