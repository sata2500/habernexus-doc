"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Wand2, ExternalLink, CheckCircle2, AlertCircle, Link2, Sparkles } from "lucide-react";
import { triggerSyncGoogleTrends, generateArticleFromTrend } from "../actions";
import { cn } from "@/lib/utils";

interface TrendItem {
  id: string;
  keyword: string;
  searchVolume: string | null;
  trafficScore: number;
  exploreUrl?: string | null;
  items: { actionTaken: string | null; rssItem: { id: string; title: string } | null }[];
}

type Message = { text: string; type: "success" | "error"; href?: string };

export function GoogleTrendsClient({ trends }: { trends: TrendItem[] }) {
  const [isSyncing, startSync] = useTransition();
  const [loadingTrendId, setLoadingTrendId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const handleSync = () => {
    setMessage(null);
    startSync(async () => {
      const res = await triggerSyncGoogleTrends();
      setMessage(res.success
        ? { type: "success", text: `${res.synced} trend güncellendi, ${res.matched} tanesi RSS haberleriyle eşleşti.` }
        : { type: "error", text: res.error ?? "Trendler alınamadı." });
    });
  };

  const handleGenerate = async (trend: TrendItem) => {
    if (!confirm(`"${trend.keyword}" hakkında yapay zekâ ile haber yazılıp yayınlansın mı?`)) return;
    setMessage(null);
    setLoadingTrendId(trend.id);
    try {
      const res = await generateArticleFromTrend(trend.id);
      setMessage(res.success
        ? { type: "success", text: `Yayınlandı: ${res.title}`, href: `/article/${res.slug}` }
        : { type: "error", text: res.error ?? "Haber yazılamadı." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Beklenmeyen hata" });
    } finally {
      setLoadingTrendId(null);
    }
  };

  const matched = trends.filter((t) => t.items.some((i) => i.rssItem)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">{trends.length} trend</span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">{matched} RSS eşleşmesi</span>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          {isSyncing ? "Güncelleniyor…" : "Şimdi güncelle"}
        </button>
      </div>

      {message && (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3.5 text-sm",
            message.type === "success" ? "border-success/30 bg-success/10" : "border-error/30 bg-error/5"
          )}
        >
          {message.type === "success"
            ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            : <AlertCircle className="h-5 w-5 shrink-0 text-error" />}
          <span className="min-w-0 break-words">
            {message.text}
            {message.href && <> · <Link href={message.href} className="font-semibold text-primary-500">Habere git</Link></>}
          </span>
        </div>
      )}

      {trends.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Henüz trend verisi yok. &quot;Şimdi güncelle&quot; ile ilk taramayı başlatın.
        </div>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {trends.map((trend) => {
            const match = trend.items.find((i) => i.rssItem)?.rssItem;
            const written = trend.items.some((i) => i.actionTaken === "SEARCH_GENERATED");
            const isLoading = loadingTrendId === trend.id;
            return (
              <li key={trend.id} className="rounded-2xl border border-border bg-card p-4 shadow-card min-w-0 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-snug break-words">
                      {trend.keyword}
                      {trend.exploreUrl && (
                        <a href={trend.exploreUrl} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex align-middle text-muted-foreground hover:text-primary-500" title="Google Trends'te aç">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{trend.searchVolume ? `${trend.searchVolume} arama` : "Popüler"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums">{trend.trafficScore}</p>
                    <div className="mt-1 h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", trend.trafficScore >= 80 ? "bg-success" : trend.trafficScore >= 60 ? "bg-warning" : "bg-muted-foreground")}
                        style={{ width: `${trend.trafficScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <p className="flex-1 min-w-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {match ? (
                      <><Link2 className="h-3.5 w-3.5 shrink-0 text-primary-500" /><span className="truncate" title={match.title}>{match.title}</span></>
                    ) : written ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />Haberi yazıldı</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5 shrink-0" />RSS&apos;te karşılığı yok</>
                    )}
                  </p>
                  <button
                    onClick={() => handleGenerate(trend)}
                    disabled={isLoading || loadingTrendId !== null}
                    className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs font-semibold disabled:opacity-50"
                  >
                    <Wand2 className={cn("h-3.5 w-3.5 text-primary-500", isLoading && "animate-pulse")} />
                    {isLoading ? "Yazılıyor…" : "Haber yaz"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
