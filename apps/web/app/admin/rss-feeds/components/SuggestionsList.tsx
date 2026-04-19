"use client";

import { useState } from "react";
import { ExternalLink, X, CheckCheck, Sparkles, TrendingUp } from "lucide-react";
import { dismissSuggestion, markAsUsed } from "../actions";
import Link from "next/link";

type SuggestionItem = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  aiScore: number | null;
  aiAnalysis: unknown;
  source: { name: string; url: string };
};

interface Props {
  suggestions: SuggestionItem[];
}

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return null;
  const color =
    score >= 75
      ? "bg-green-500/15 text-green-600"
      : score >= 55
      ? "bg-amber-500/15 text-amber-600"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>
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

  const handleUsed = async (id: string) => {
    setLoadingId(id);
    await markAsUsed(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
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
        } | null;

        return (
          <div
            key={item.id}
            className={`relative bg-background rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md hover:border-primary-500/30 ${
              loadingId === item.id ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {/* Score Badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <ScoreBadge score={item.aiScore} />
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1 gap-3">
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
            <div className="border-t border-border p-3 flex gap-2">
              <Link
                href={`/author/articles/new`}
                onClick={() => handleUsed(item.id)}
                className="flex-1 text-center px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/20"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Haber Yaz
              </Link>
              <button
                onClick={() => handleDismiss(item.id)}
                title="İlginç Değil"
                className="px-3 py-2 rounded-xl bg-muted hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
