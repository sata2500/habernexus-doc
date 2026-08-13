"use client";

import { useState, useTransition } from "react";
import { TrendingUp, RefreshCw, Wand2, Sparkles, CheckCircle2 } from "lucide-react";
import { triggerSyncGoogleTrends, generateArticleFromTrend } from "../../google-trends/actions";
import { cn } from "@/lib/utils";

interface GoogleTrendsBarProps {
  trends: Record<string, unknown>[];
}

export function GoogleTrendsBar({ trends }: GoogleTrendsBarProps) {
  const [isPending, startTransition] = useTransition();
  const [loadingTrendId, setLoadingTrendId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await triggerSyncGoogleTrends();
      if (res.success) {
        setMessage(`${res.synced} Google Trend verisi çekildi ve RSS haberleriyle eşleştirildi.`);
      }
    });
  };

  const handleGenerateFromTrend = (trendId: string) => {
    setLoadingTrendId(trendId);
    setMessage(null);
    startTransition(async () => {
      const res = await generateArticleFromTrend(trendId);
      setLoadingTrendId(null);
      if (res.success) {
        setMessage(`Trend haberi başarıyla üretildi: &quot;${res.title}&quot;`);
      }
    });
  };

  return (
    <div className="glass-strong rounded-3xl p-5 border border-border/50 shadow-soft space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center border border-primary-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold font-display text-sm text-foreground flex items-center gap-2">
              Google Trends Canlı Arama Fırsatları
            </h3>
            <p className="text-xs text-muted-foreground">
              Google&apos;da şu an en çok aranan konular ve RSS eşleşme fırsatları.
            </p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition-all border border-border/40 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
          {isPending ? "Güncelleniyor..." : "Trends Güncelle"}
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-primary-/10 text-primary- border border-primary-/20 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Trend Fırsatları Akışı */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {trends.length === 0 ? (
          <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
            Henüz trend çekilmemiş. &quot;Trends Güncelle&quot; butonuna tıklayarak ilk aramayı yapabilirsiniz.
          </div>
        ) : (
          trends.slice(0, 6).map((trend: any) => {
            const hasMatchedRss = trend.items?.some((i: any) => i.rssItem);
            const isLoading = loadingTrendId === trend.id;

            return (
              <div
                key={trend.id}
                className="p-3.5 rounded-2xl bg-card/60 border border-border/40 flex items-center justify-between gap-3 hover:border-primary-500/30 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground truncate">{trend.keyword}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-500 shrink-0">
                      {trend.searchVolume || "10K+"}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                    {hasMatchedRss ? (
                      <span className="text-primary- font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> RSS ile Eşleşti
                      </span>
                    ) : (
                      <span className="text-primary- font-semibold flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Trend Fırsatı (Arama Odaklı)
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => handleGenerateFromTrend(trend.id)}
                  disabled={isPending || isLoading}
                  className="px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
                  title="Google Arama ile Bu Konuda Haber Yaz"
                >
                  <Wand2 className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
