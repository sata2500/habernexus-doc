"use client";

import { useState, useTransition } from "react";
import { TrendingUp, RefreshCw, Wand2, ExternalLink, CheckCircle2, AlertCircle, Sparkles, Layers } from "lucide-react";
import { triggerSyncGoogleTrends, generateArticleFromTrend } from "../actions";
import { cn } from "@/lib/utils";

interface TrendItem {
  id: string;
  keyword: string;
  searchVolume: string | null;
  trafficScore: number;
  exploreUrl?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items?: any[];
}

interface GoogleTrendsClientProps {
  trends: TrendItem[];
  settings?: unknown;
}

export function GoogleTrendsClient({ trends }: GoogleTrendsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [loadingTrendId, setLoadingTrendId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSync = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await triggerSyncGoogleTrends();
      if (res.success) {
        setMessage({
          text: `Google Trends senkronize edildi! ${res.synced} trend çekildi, ${res.matched} RSS haberi ile eşleşti.`,
          type: "success",
        });
      } else {
        setMessage({ text: `Hata: ${res.error}`, type: "error" });
      }
    });
  };

  const handleGenerateArticle = async (trendId: string) => {
    setMessage(null);
    setLoadingTrendId(trendId);
    try {
      const res = await generateArticleFromTrend(trendId);
      if (res.success) {
        setMessage({
          text: `Makale başarıyla üretildi! (ID: ${res.articleId})`,
          type: "success",
        });
      } else {
        setMessage({ text: `Hata: ${res.error}`, type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Beklenmeyen hata";
      setMessage({ text: `Hata: ${msg}`, type: "error" });
    } finally {
      setLoadingTrendId(null);
    }
  };

  const highViralityCount = trends.filter((t) => t.trafficScore >= 75).length;
  const contentGapCount = trends.filter((t) =>
    t.items?.some((i) => i.actionTaken === "SEARCH_GENERATED")
  ).length;

  return (
    <div className="space-y-6">
      {/* Üst İstatistikler & Butonlar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 glass-strong p-5 rounded-2xl border border-border/50 shadow-soft">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Aktif Trend</p>
              <p className="text-lg font-bold text-foreground font-display">{trends.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-/10 text-primary- flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Yüksek Virallik</p>
              <p className="text-lg font-bold text-primary- font-display">{highViralityCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-/10 text-primary- flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Content Gap</p>
              <p className="text-lg font-bold text-primary- font-display">{contentGapCount}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={isPending}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all shadow-md shadow-primary-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
          {isPending ? "Trendler Çekiliyor..." : "Trends Verilerini Güncelle"}
        </button>
      </div>

      {/* Bildirim Mesajı */}
      {message && (
        <div
          className={cn(
            "p-4 rounded-xl flex items-center gap-3 text-sm font-semibold border transition-all",
            message.type === "success"
              ? "bg-primary-/10 text-primary- border-primary-/20"
              : "bg-primary-500/10 text-primary-500 border-primary-500/20"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Trend Tablosu */}
      <div className="glass-strong rounded-2xl border border-border/50 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Trend Anahtar Kelime</th>
                <th className="px-6 py-4">Arama Hacmi</th>
                <th className="px-6 py-4">Virallik Skoru</th>
                <th className="px-6 py-4">RSS Eşleşmesi</th>
                <th className="px-6 py-4 text-right">Eylem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {trends.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Henüz Google Trends verisi çekilmemiş. &quot;Trends Verilerini Güncelle&quot; butonuna tıklayarak ilk taramayı başlatın.
                  </td>
                </tr>
              ) : (
                trends.map((trend) => {
                  const matchedItem = trend.items?.[0];
                  const isLoading = loadingTrendId === trend.id;

                  return (
                    <tr key={trend.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{trend.keyword}</span>
                          {trend.exploreUrl && (
                            <a
                              href={trend.exploreUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-primary-500 transition-colors"
                              title="Google Trends'te Aç"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-muted text-foreground border border-border/40">
                          {trend.searchVolume || "Popüler"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                trend.trafficScore >= 80
                                  ? "bg-primary-"
                                  : trend.trafficScore >= 60
                                  ? "bg-primary-"
                                  : "bg-primary-"
                              )}
                              style={{ width: `${trend.trafficScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">{trend.trafficScore}/100</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {matchedItem?.rssItem ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary- bg-primary-/10 px-2.5 py-1 rounded-lg border border-primary-/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {matchedItem.rssItem.title.slice(0, 30)}...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary- bg-primary-/10 px-2.5 py-1 rounded-lg border border-primary-/20">
                            <Sparkles className="h-3.5 w-3.5" />
                            Content Gap (Arama Odaklı)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleGenerateArticle(trend.id)}
                          disabled={isPending || isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Wand2 className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                          {isLoading ? "Yazılıyor..." : "Haber Yaz"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
