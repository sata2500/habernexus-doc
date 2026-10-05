"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Loader2, PenSquare, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { dismissSuggestionByAuthor, markSuggestionAsUsed } from "../actions";

type SuggestionItem = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  aiScore: number | null;
  status: string;
  aiAnalysis: { suggestedTitles: string[]; suggestedCategory?: string; reasoning?: string };
  source: { name: string };
};

function scoreTone(score: number) {
  return score >= 75 ? "bg-success/10 text-success" : score >= 60 ? "bg-primary-500/10 text-primary-500" : "bg-muted text-muted-foreground";
}

function SuggestionRow({ item, onRemove }: { item: SuggestionItem; onRemove: (id: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [action, setAction] = useState<"write" | "dismiss" | null>(null);
  const headline = item.aiAnalysis.suggestedTitles[0] || item.title;
  const score = item.aiScore ?? 0;

  const write = () => {
    setAction("write");
    start(async () => {
      await markSuggestionAsUsed(item.id);
      router.push(`/author/articles/new?oneri=${item.id}`);
    });
  };
  const dismiss = () => {
    setAction("dismiss");
    start(async () => {
      await dismissSuggestionByAuthor(item.id);
      onRemove(item.id);
    });
  };

  return (
    <li className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-card min-w-0">
      <div className="flex items-start gap-3">
        <span className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold tabular-nums", scoreTone(score))} title="Öncelik puanı">
          {score}
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <h2 className="font-semibold leading-snug">{headline}</h2>
          <p className="text-[11px] text-muted-foreground">
            {item.source.name}
            {item.aiAnalysis.suggestedCategory && <> · <span className="font-semibold text-primary-500">{item.aiAnalysis.suggestedCategory}</span></>}
            {item.status === "APPROVED" && <> · <span className="font-semibold">Editör öne aldı</span></>}
          </p>
          {item.excerpt && <p className={cn("text-sm text-muted-foreground", !open && "line-clamp-2")}>{item.excerpt}</p>}
          {open && (
            <div className="space-y-1.5 pt-1 text-xs">
              {item.aiAnalysis.reasoning && <p className="italic text-muted-foreground">{item.aiAnalysis.reasoning}</p>}
              {headline !== item.title && <p className="text-muted-foreground">Kaynak başlık: {item.title}</p>}
              <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary-500">
                Kaynağı aç <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 pl-[3.25rem]">
        <button onClick={write} disabled={pending} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
          {pending && action === "write" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenSquare className="h-4 w-4" />} Haber yaz
        </button>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-border text-xs font-semibold hover:bg-muted">
          Ayrıntı <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <button onClick={dismiss} disabled={pending} aria-label="İlginç değil" title="İlginç değil" className="ml-auto h-9 w-9 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:bg-error/10 hover:text-error disabled:opacity-50">
          {pending && action === "dismiss" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      </div>
    </li>
  );
}

export function SuggestionsGrid({ suggestions }: { suggestions: SuggestionItem[] }) {
  const [items, setItems] = useState(suggestions);
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="font-semibold">Şu an önerilen konu yok</p>
        <p className="mt-1 text-sm text-muted-foreground">Kaynaklar düzenli taranıyor; yeni konular puanlandıkça burada görünür.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">{items.length} konu · en yüksek öncelik üstte</p>
      <ul className="grid gap-3 xl:grid-cols-2">
        {items.map((item) => <SuggestionRow key={item.id} item={item} onRemove={remove} />)}
      </ul>
    </>
  );
}
