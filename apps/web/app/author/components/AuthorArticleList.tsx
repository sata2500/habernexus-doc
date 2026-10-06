"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BarChart3, ExternalLink, Eye, Loader2, MessageSquare, Newspaper, Pencil, PenSquare, Sparkles, Trash2 } from "lucide-react";
import { cn, formatRelativeTime, formatViewCount } from "@/lib/utils";
import type { AuthorArticleRow } from "@/lib/server/author-desk";
import { displayScore } from "@/lib/analysis/report";
import { deleteArticle } from "../actions";

const ArticleAnalysisModal = dynamic(
  () => import("@/components/article/ArticleAnalysisModal").then((m) => m.ArticleAnalysisModal),
  { ssr: false }
);

function scoreTone(score: number) {
  return score >= 70 ? "text-success bg-success/10" : score >= 40 ? "text-warning bg-warning/10" : "text-error bg-error/10";
}

export function AuthorArticleList({ articles, filtered }: { articles: AuthorArticleRow[]; filtered: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, start] = useTransition();
  const [analysis, setAnalysis] = useState<AuthorArticleRow | null>(null);

  const remove = (a: AuthorArticleRow) => {
    if (!confirm(`"${a.title}" kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusyId(a.id);
    start(async () => {
      const r = await deleteArticle(a.id);
      if (!r.success) alert(r.error ?? "Haber silinemedi.");
      setBusyId(null);
      router.refresh();
    });
  };

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Newspaper className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="font-semibold">{filtered ? "Bu filtrelere uygun haber yok" : "Henüz haber yazmadın"}</p>
        {!filtered && (
          <Link href="/author/articles/new" className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 text-white text-sm font-semibold">
            <PenSquare className="h-4 w-4" /> İlk haberini yaz
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border overflow-hidden">
        {articles.map((a) => {
          const published = a.status === "PUBLISHED";
          return (
            <li key={a.id} className="flex gap-3 p-3 sm:p-4">
              <Link href={`/author/articles/${a.id}/edit`} className="relative hidden sm:block h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-muted" tabIndex={-1} aria-hidden>
                {a.coverImage ? <Image src={a.coverImage} alt="" fill sizes="96px" className="object-cover" /> : <Newspaper className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground/40" />}
              </Link>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Link href={`/author/articles/${a.id}/edit`} className="block text-sm sm:text-base font-semibold leading-snug line-clamp-2 hover:text-primary-500">
                  {a.title || "Başlıksız taslak"}
                </Link>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span className={cn("rounded-full px-2 py-0.5 font-bold", published ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                    {published ? "Yayında" : "Taslak"}
                  </span>
                  {a.aiPersonaId && <span className="inline-flex items-center gap-0.5 font-semibold text-primary-500"><Sparkles className="h-3 w-3" /> AI</span>}
                  {a.category && <span className="font-semibold" style={{ color: a.category.color || undefined }}>{a.category.name}</span>}
                  <span>{published && a.publishedAt ? formatRelativeTime(a.publishedAt, { compact: true }) : `düzenlendi ${formatRelativeTime(a.updatedAt, { compact: true })}`}</span>
                  {published && <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatViewCount(a.viewCount)}</span>}
                  {a._count.comments > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" /> {a._count.comments}</span>}
                  {(() => {
                    const score = displayScore(a.analysisReport, a.qualityScore);
                    return score ? (
                      <button onClick={() => setAnalysis(a)} className={cn("rounded px-1.5 py-0.5 font-bold cursor-pointer", scoreTone(score.value))} title="Analizi aç">
                        {score.label} {score.value}
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>
              <div className="flex items-start gap-0.5 shrink-0">
                {busyId === a.id ? (
                  <Loader2 className="h-4 w-4 m-2 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Link href={`/author/articles/${a.id}/edit`} aria-label="Düzenle" title="Düzenle" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    {published && (
                      <Link href={`/article/${a.slug}`} target="_blank" aria-label="Sitede gör" title="Sitede gör" className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    <button onClick={() => setAnalysis(a)} aria-label="Kalite analizi" title="Kalite analizi" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(a)} aria-label="Sil" title="Sil" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-error/10 hover:text-error">
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
          userRole="AUTHOR"
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
    </>
  );
}
