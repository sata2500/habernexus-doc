"use client";

import { confirmDialog, toast } from "@/components/ui/feedback";

import { displayScore } from "@/lib/analysis/report";
import { useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BarChart3, CheckSquare, ExternalLink, Eye, EyeOff, Loader2, Pencil, Sparkles, Square, Trash2, X } from "lucide-react";
import { updateArticleStatus, deleteArticle, bulkUpdateArticleStatus, bulkDeleteArticles } from "../actions";
import { cn, formatRelativeTime, formatViewCount } from "@/lib/utils";
import type { AdminArticleRow } from "@/lib/server/admin-lists";

const ArticleAnalysisModal = dynamic(
  () => import("@/components/article/ArticleAnalysisModal").then((mod) => mod.ArticleAnalysisModal),
  { ssr: false }
);

function scoreClass(score: number) {
  return score >= 80 ? "text-success bg-success/10" : score >= 50 ? "text-warning bg-warning/10" : "text-error bg-error/10";
}

export function ArticleModerator({ articles }: { articles: AdminArticleRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analysis, setAnalysis] = useState<AdminArticleRow | null>(null);

  // Sayfa/filtre değişince seçim sıfırlansın
  const [prevArticles, setPrevArticles] = useState(articles);
  if (articles !== prevArticles) {
    setPrevArticles(articles);
    setSelected(new Set());
  }

  const run = (id: string | null, fn: () => Promise<{ success: boolean; error?: string }>) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) toast.error(res.error ?? "İşlem başarısız.");
      setBusyId(null);
      router.refresh();
    });
  };

  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = articles.length > 0 && selected.size === articles.length;
  const ids = [...selected];

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Bu filtrelere uygun makale yok.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Seçim ve toplu işlemler */}
      <div className={cn("flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5", selected.size > 0 && "bg-primary-500/10")}>
        <button onClick={() => setSelected(allSelected ? new Set() : new Set(articles.map((a) => a.id)))} className="inline-flex items-center gap-2 h-8 px-2 rounded-lg text-xs font-semibold hover:bg-muted">
          {allSelected ? <CheckSquare className="h-4 w-4 text-primary-500" /> : <Square className="h-4 w-4 text-muted-foreground" />}
          {selected.size > 0 ? `${selected.size} seçili` : "Tümünü seç"}
        </button>
        {selected.size > 0 && (
          <>
            <button disabled={isPending} onClick={() => run(null, () => bulkUpdateArticleStatus(ids, "PUBLISHED"))} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-card border border-border text-xs font-semibold disabled:opacity-50">
              <Eye className="h-3.5 w-3.5" /> Yayınla
            </button>
            <button disabled={isPending} onClick={() => run(null, () => bulkUpdateArticleStatus(ids, "DRAFT"))} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-card border border-border text-xs font-semibold disabled:opacity-50">
              <EyeOff className="h-3.5 w-3.5" /> Taslağa al
            </button>
            <button
              disabled={isPending}
              onClick={async () => { if (await confirmDialog({ title: `${ids.length} haber silinsin mi?`, message: "Haberler kalıcı olarak silinir; bu işlem geri alınamaz.", confirmText: "Sil", tone: "danger" })) run(null, () => bulkDeleteArticles(ids)); }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-error text-white text-xs font-semibold disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>
            <button onClick={() => setSelected(new Set())} aria-label="Seçimi temizle" className="ml-auto h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <ul className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border overflow-hidden">
        {articles.map((a) => {
          const isSelected = selected.has(a.id);
          const busy = busyId === a.id;
          const published = a.status === "PUBLISHED";
          return (
            <li key={a.id} className={cn("flex items-start gap-3 p-3 sm:p-4", isSelected && "bg-primary-500/5")}>
              <button onClick={() => toggle(a.id)} aria-label={isSelected ? "Seçimi kaldır" : "Seç"} aria-pressed={isSelected} className="mt-0.5 h-8 w-8 -m-1.5 inline-flex items-center justify-center rounded-lg hover:bg-muted shrink-0">
                {isSelected ? <CheckSquare className="h-4 w-4 text-primary-500" /> : <Square className="h-4 w-4 text-muted-foreground" />}
              </button>

              <div className="flex-1 min-w-0 space-y-1.5">
                <Link href={`/author/articles/${a.id}/edit`} className="block text-sm font-semibold leading-snug line-clamp-2 hover:text-primary-500">
                  {a.title}
                </Link>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 font-bold", published ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                    {published ? "Yayında" : "Taslak"}
                  </span>
                  {a.aiPersona && (
                    <span className="inline-flex items-center gap-1 font-semibold text-primary-500"><Sparkles className="h-3 w-3" />{a.aiPersona.name}</span>
                  )}
                  {!a.aiPersona && <span>{a.author.name ?? "İsimsiz"}</span>}
                  {a.category && <span style={{ color: a.category.color || undefined }} className="font-semibold">{a.category.name}</span>}
                  <span>{formatRelativeTime(a.publishedAt ?? a.createdAt, { compact: true })}</span>
                  <span>{formatViewCount(a.viewCount)} okunma</span>
                  {(() => {
                    const score = displayScore(a.analysisReport, a.qualityScore);
                    return score && <span className={cn("rounded px-1.5 py-0.5 font-bold", scoreClass(score.value))} title="Analiz puanı">{score.label} {score.value}</span>;
                  })()}
                  {(a.plagiarismRate ?? 0) > 30 && (
                    <span className="rounded px-1.5 py-0.5 font-bold text-error bg-error/10" title="Benzerlik oranı">Benzerlik %{a.plagiarismRate}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {busy ? (
                  <Loader2 className="h-4 w-4 m-2 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    {published && (
                      <Link href={`/article/${a.slug}`} target="_blank" aria-label="Sitede gör" className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    <button onClick={() => setAnalysis(a)} aria-label="Kalite analizi" className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <Link href={`/author/articles/${a.id}/edit`} aria-label="Düzenle" className="sm:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => run(a.id, () => updateArticleStatus(a.id, published ? "DRAFT" : "PUBLISHED"))}
                      aria-label={published ? "Taslağa al" : "Yayınla"}
                      title={published ? "Taslağa al" : "Yayınla"}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={async () => { if (await confirmDialog({ title: "Haber silinsin mi?", message: `"${a.title}" kalıcı olarak silinir; bu işlem geri alınamaz.`, confirmText: "Sil", tone: "danger" })) run(a.id, () => deleteArticle(a.id)); }}
                      aria-label="Sil"
                      title="Sil"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {analysis && (
        <ArticleAnalysisModal
          articleId={analysis.id}
          articleTitle={analysis.title}
          userRole="ADMIN"
          initialData={{
            plagiarismRate: analysis.plagiarismRate,
            seoScore: analysis.seoScore,
            readabilityScore: analysis.readabilityScore,
            qualityScore: analysis.qualityScore,
            analysisReport: analysis.analysisReport,
          }}
          onClose={() => setAnalysis(null)}
          onAnalysisComplete={() => router.refresh()}
        />
      )}
    </div>
  );
}
