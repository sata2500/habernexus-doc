"use client";

import { useState } from "react";
import { ExternalLink, X, CheckCheck, Sparkles, TrendingUp, Wand2, RefreshCw, AlertTriangle, Undo2 } from "lucide-react";
import { dismissSuggestion, approveSuggestion, triggerAiWriter, reAnalyzeSuggestion, revertToAnalyzed } from "../actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";


type SuggestionItem = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  aiScore: number | null;
  aiAnalysis: unknown;
  status: string;
  source: { name: string; url: string };
  googleTrendItems?: Array<{
    trend: { id: string; keyword: string; searchVolume: string | null; trafficScore: number };
  }>;
};

interface Props {
  suggestions: SuggestionItem[];
}

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return null;
  const color =
    score >= 75
      ? "bg-success/10 text-success border border-success/10"
      : score >= 55
      ? "bg-warning/10 text-warning border border-warning/10"
      : "bg-muted text-muted-foreground border border-border/40";
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${color}`}>
      {score}/100
    </span>
  );
}


export function SuggestionsList({ suggestions: initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDismiss = async (id: string) => {
    setLoadingId(id);
    await dismissSuggestion(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setLoadingId(null);
  };

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    const res = await approveSuggestion(id);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    setLoadingId(null);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border mt-6">
        <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="font-medium text-muted-foreground">Bekleyen öneri bulunmuyor.</p>
        <p className="text-sm text-muted-foreground mt-1">
          RSS kaynakları tarandıktan ve AI analizi yapıldıktan sonra öneriler burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
      {items.map((item) => {
        const analysis = item.aiAnalysis as {
          suggestedTitles?: string[];
          suggestedCategory?: string;
          reasoning?: string;
          isFallback?: boolean;
          retryCount?: number;
        } | null;

        const trendMatch = item.googleTrendItems?.[0]?.trend;

        return (
          <div
            key={item.id}
            className={cn(
              "relative glass-strong rounded-3xl border flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg",
              item.status === "APPROVED" ? "border-primary-500/30 bg-primary-500/5" :
              item.status === "DISMISSED" ? "border-primary-500/20 bg-primary-500/5" :
              "border-border/60 hover:border-primary-500/30 hover:shadow-glow",
              loadingId === item.id && "opacity-50 pointer-events-none"
            )}
          >
            {/* Score Badge */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              {item.status === "APPROVED" && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-500 text-white text-[10px] font-bold shadow-sm">
                   Onaylandı
                </div>
              )}
              {item.status === "DISMISSED" && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-error text-white text-[10px] font-bold shadow-sm">
                   Reddedildi
                </div>
              )}

              {analysis?.isFallback && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20" title="AI Analizi başarısız oldu, manuel bilgiler kullanılıyor.">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px] font-bold">Fallback</span>
                </div>
              )}
              <ScoreBadge score={item.aiScore} />
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1 gap-3">
              {/* Google Trend Eşleşme Rozeti */}
              {trendMatch && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-500/10 text-primary-500 border border-primary-500/20 text-[11px] font-extrabold shadow-xs">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Google Trend: {trendMatch.keyword} ({trendMatch.searchVolume || "Popüler"})</span>
                </div>
              )}

              {/* Source */}
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5" />
                {item.source.name}
                {item.publishedAt && (
                  <>
                    {" · "}
                    {new Date(item.publishedAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </p>

              {/* Original Title */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Kaynak Başlık:</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold hover:text-primary-600 transition-colors line-clamp-2 flex items-start gap-1 group"
                >
                  {item.title}
                  <ExternalLink className="h-3 w-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>

              {/* AI Suggested Titles */}
              {analysis?.suggestedTitles && analysis.suggestedTitles.length > 0 && (
                <div className="bg-primary-500/5 border border-primary-500/15 rounded-xl p-3">
                  <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Başlık Önerileri
                  </p>
                  {analysis.suggestedTitles.map((title, i) => (
                    <p key={i} className="text-xs text-foreground mb-1 last:mb-0">
                      {i + 1}. {title}
                    </p>
                  ))}
                </div>
              )}

              {/* Category & Reasoning */}
              <div className="flex items-center gap-2 flex-wrap">
                {analysis?.suggestedCategory && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                    {analysis.suggestedCategory}
                  </span>
                )}
                {analysis?.reasoning && (
                  <p className="text-[10px] text-muted-foreground italic flex-1">
                    {analysis.reasoning}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border/40 p-3 flex flex-wrap gap-2 items-center">
              {item.status === "ANALYZED" ? (
                <>
                  <Button
                    onClick={() => handleApprove(item.id)}
                    disabled={loadingId !== null}
                    isLoading={loadingId === item.id}
                    className="flex-1 py-2 h-9 text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Haber Yazılsın
                  </Button>
                  
                  <button
                    onClick={async () => {
                      setLoadingId(item.id);
                      const res = await triggerAiWriter(item.id);
                      if (res.success) {
                        setItems((prev) => prev.filter((i) => i.id !== item.id));
                      } else {
                        alert("AI Hatası: " + res.error);
                      }
                      setLoadingId(null);
                    }}
                    disabled={loadingId !== null}
                    title="Yapay Zeka İle Tam Otomatik Yaz"
                    className="px-3.5 py-2 h-9 rounded-xl bg-accent-500 hover:opacity-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-accent-500/15 active:scale-95 disabled:opacity-50 cursor-pointer outline-none focus-ring"
                  >
                    {loadingId === item.id ? (
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    AI Yazdır
                  </button>

                  <button
                    onClick={async () => {
                      setLoadingId(item.id);
                      const res = await reAnalyzeSuggestion(item.id);
                      if (res.success) {
                        window.location.reload();
                      }
                      setLoadingId(null);
                    }}
                    disabled={loadingId !== null}
                    title="Yeniden AI Analizi Yap"
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted hover:bg-primary-500/10 dark:hover:bg-primary-500/15 text-muted-foreground hover:text-primary-500 dark:hover:text-primary-400 active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-ring"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingId === item.id ? "animate-spin" : ""}`} />
                  </button>

                  <button
                    onClick={() => handleDismiss(item.id)}
                    disabled={loadingId !== null}
                    title="İlginç Değil"
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted hover:bg-primary-500/10 dark:hover:bg-primary-500/15 text-muted-foreground hover:text-primary-500 dark:hover:text-primary-400 active:scale-95 transition-all cursor-pointer disabled:opacity-50 outline-none focus-ring"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => {
                    setLoadingId(item.id);
                    await revertToAnalyzed(item.id);
                    window.location.reload();
                    setLoadingId(null);
                  }}
                  className="flex-1 text-center px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-border/80 cursor-pointer outline-none focus-ring"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  İşlemi Geri Al (Aktif Listeye Taşı)
                </button>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
