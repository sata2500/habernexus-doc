"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { emptyCounts, REACTIONS, type ReactionSummary, type ReactionType } from "@/lib/reaction-types";
import { getArticleReactions, setArticleReaction } from "../reaction-actions";

interface ArticleReactionsProps {
  articleId: string;
}

/** Okur tepkileri: veritabanında saklanır, herkes aynı gerçek sayıları görür. */
export function ArticleReactions({ articleId }: ArticleReactionsProps) {
  const [summary, setSummary] = useState<ReactionSummary | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Sayfa önbellekli (ISR) olduğu için sayılar ve kullanıcının tepkisi istemcide yüklenir
  useEffect(() => {
    let active = true;
    getArticleReactions(articleId)
      .then((s) => { if (active) setSummary(s); })
      .catch(() => { if (active) setSummary({ available: false, counts: emptyCounts(), mine: null }); });
    return () => { active = false; };
  }, [articleId]);

  // Tepki tablosu yoksa (veritabanı güncellemesi bekliyor) bölümü hiç gösterme
  if (summary && !summary.available) return null;

  const counts = summary?.counts ?? emptyCounts();
  const mine = summary?.mine ?? null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const handleSelect = (type: ReactionType) => {
    if (!summary || isPending) return;
    setError("");

    // İyimser güncelleme: anında göster, sunucu cevabıyla düzelt
    const previous = summary;
    const nextCounts = { ...counts };
    if (mine) nextCounts[mine] = Math.max(0, nextCounts[mine] - 1);
    const nextMine = mine === type ? null : type;
    if (nextMine) nextCounts[nextMine] += 1;
    setSummary({ ...summary, counts: nextCounts, mine: nextMine });

    startTransition(async () => {
      const res = await setArticleReaction(articleId, nextMine);
      if (res.success) setSummary(res.summary);
      else { setSummary(previous); setError(res.error); }
    });
  };

  return (
    <section aria-label="Okur tepkileri" className="w-full my-8 p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/60">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold font-display text-foreground">
          <Sparkles className="h-4 w-4 text-primary-500 shrink-0" aria-hidden="true" />
          Bu habere tepkiniz?
        </h2>
        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium shrink-0">
          {summary ? (total > 0 ? `${total} tepki` : "İlk tepkiyi siz verin") : " "}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {REACTIONS.map((r) => {
          const isSelected = mine === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r.id)}
              disabled={!summary}
              aria-pressed={isSelected}
              aria-label={`${r.label}: ${counts[r.id]}`}
              title={r.label}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 group disabled:cursor-default",
                isSelected
                  ? "bg-primary-500/15 border-primary-500 text-foreground ring-1 ring-primary-500/30"
                  : "bg-card/70 border-border/60 hover:border-primary-500/40 hover:bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-xl sm:text-2xl leading-none group-hover:scale-110 transition-transform duration-200 select-none">
                {r.emoji}
              </span>
              <span className={cn("text-xs font-bold tabular-nums min-h-4", isSelected && "text-primary-500")}>
                {summary ? counts[r.id] : ""}
              </span>
              <span className="hidden sm:block text-[11px] font-medium truncate max-w-full">{r.label}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-xs text-error" role="alert">{error}</p>}
    </section>
  );
}
