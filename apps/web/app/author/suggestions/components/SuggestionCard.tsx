"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  X,
  CheckCheck,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  dismissSuggestionByAuthor,
  markSuggestionAsUsed,
} from "../actions";

type SuggestionItem = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  publishedAt: Date | null;
  aiScore: number | null;
  aiAnalysis: unknown;
  source: { name: string };
};

interface Props {
  suggestions: SuggestionItem[];
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-green-500" : score >= 55 ? "bg-amber-500" : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{score}</span>
    </div>
  );
}

export function SuggestionCard({ item, onRemove }: { item: SuggestionItem; onRemove: (id: string) => void }) {
  const [loading, setLoading] = useState<"dismiss" | "use" | null>(null);
  const analysis = item.aiAnalysis as {
    suggestedTitles?: string[];
    suggestedCategory?: string;
    reasoning?: string;
  } | null;

  const handleDismiss = async () => {
    setLoading("dismiss");
    await dismissSuggestionByAuthor(item.id);
    onRemove(item.id);
  };

  const handleUse = async () => {
    setLoading("use");
    await markSuggestionAsUsed(item.id);
    onRemove(item.id);
  };

  return (
    <div className="group bg-background rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-primary-500/30 transition-all duration-300 flex flex-col overflow-hidden">
      {/* Score Header */}
      <div className="px-4 pt-4 pb-2">
        <ScoreBar score={item.aiScore ?? 50} />
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3 flex-1">
        {/* Meta */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
          <TrendingUp className="h-2.5 w-2.5" />
          {item.source.name}
          {item.publishedAt && (
            <>
              <span className="mx-1">·</span>
              <Clock className="h-2.5 w-2.5" />
              {new Date(item.publishedAt).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
          {analysis?.suggestedCategory && (
            <>
              <span className="mx-1">·</span>
              <span className="text-primary-600">{analysis.suggestedCategory}</span>
            </>
          )}
        </div>

        {/* Original Title */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Kaynak Haber:</p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors line-clamp-2 flex items-start gap-1 group/link"
          >
            {item.title}
            <ExternalLink className="h-3 w-3 shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* AI Suggested Titles */}
        {analysis?.suggestedTitles && analysis.suggestedTitles.length > 0 && (
          <div className="bg-gradient-to-br from-primary-500/5 to-purple-500/5 border border-primary-500/15 rounded-xl p-3">
            <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Önerilen Başlıklar
            </p>
            {analysis.suggestedTitles.map((title, i) => (
              <p key={i} className="text-sm font-semibold text-foreground mb-1 last:mb-0 leading-snug">
                {i + 1}. {title}
              </p>
            ))}
          </div>
        )}

        {/* Reasoning */}
        {analysis?.reasoning && (
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            💡 {analysis.reasoning}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-border p-3 flex gap-2">
        <Link
          href="/author/articles/new"
          onClick={handleUse}
          className="flex-1 text-center px-3 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/20 active:scale-95 cursor-pointer"
        >
          {loading === "use" ? (
            <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCheck className="h-3.5 w-3.5" />
          )}
          Haber Yaz
        </Link>
        <button
          onClick={handleDismiss}
          disabled={!!loading}
          title="İlginç Değil"
          className="px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all cursor-pointer disabled:opacity-40 border border-border hover:border-red-200 dark:hover:border-red-800"
        >
          {loading === "dismiss" ? (
            <span className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin block" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export function SuggestionsGrid({ suggestions }: Props) {
  const [items, setItems] = useState(suggestions);

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border">
        <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-semibold text-muted-foreground">Şu an için öneri bulunmuyor</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          RSS kaynakları düzenli olarak taranıyor. Yeni haberler geldiğinde burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {items.map((item) => (
        <SuggestionCard key={item.id} item={item} onRemove={handleRemove} />
      ))}
    </div>
  );
}
