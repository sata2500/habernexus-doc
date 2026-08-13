"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { 
  PlusCircle, 
  Eye, 
  FileText, 
  Pencil, 
  Newspaper, 
  Sparkles, 
  Gauge, 
  AlertTriangle
} from "lucide-react";
import { DeleteArticleButton } from "./DeleteArticleButton";
import { ArticleAnalysisModal } from "@/components/article/ArticleAnalysisModal";
import { cn } from "@/lib/utils";

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt?: string | null;
  coverImage?: string | null;
  viewCount: number;
  aiPersonaId: string | null;
  categoryId: string | null;
  plagiarismRate: number | null;
  seoScore: number | null;
  readabilityScore: number | null;
  qualityScore: number | null;
  analysisReport: unknown;
  publishedAt: Date | null;
  createdAt: Date;
  category: { id: string; name: string } | null;
}

interface AuthorArticlesClientProps {
  initialArticles: ArticleItem[];
}

function getStatusLabel(status: string) {
  if (status === "PUBLISHED") return { label: "Yayında", variant: "success" as const };
  if (status === "DRAFT") return { label: "Taslak", variant: "warning" as const };
  return { label: status, variant: "default" as const };
}

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function AuthorArticlesClient({ initialArticles }: AuthorArticlesClientProps) {
  const [articles, setArticles] = useState<ArticleItem[]>(initialArticles);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAnalysisComplete = (updatedArticle: any) => {
    setArticles((prev) =>
      prev.map((art) => (art.id === updatedArticle.id ? { ...art, ...updatedArticle } : art))
    );
    // Update currently open modal data too
    if (selectedArticle && selectedArticle.id === updatedArticle.id) {
      setSelectedArticle({ ...selectedArticle, ...updatedArticle });
    }
  };

  const getScoreColor = (score: number, isPlagiarism = false) => {
    if (isPlagiarism) {
      if (score <= 30) return "text-success bg-success/10 border-success/20";
      if (score <= 60) return "text-warning bg-warning/10 border-warning/20";
      return "text-error bg-error/10 border-error/20";
    } else {
      if (score >= 70) return "text-success bg-success/10 border-success/20";
      if (score >= 40) return "text-warning bg-warning/10 border-warning/20";
      return "text-error bg-error/10 border-error/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Makalelerim</h1>
          <p className="text-muted-foreground text-sm">Toplam {articles.length} makale bulundu.</p>
        </div>
        <Link href="/author/articles/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto gap-2">
            <PlusCircle className="h-4 w-4" />
            Yeni Haber Yaz
          </Button>
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
          <Newspaper className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium">Henüz makale yok</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">İlk haberinizi eklemeye başlayın.</p>
          <Link href="/author/articles/new">
            <Button>
              İlk Haberimi Yaz
            </Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
          {articles.map((article) => {
            const { label, variant } = getStatusLabel(article.status);
            const isAnalyzed = article.qualityScore !== null;
            const hasHighPlagiarism = isAnalyzed && (article.plagiarismRate ?? 0) > 30;

            return (
              <div
                key={article.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-background hover:bg-muted/30 transition-colors"
              >
                {/* Article Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center relative",
                    article.aiPersonaId && "bg-primary-500/10 text-primary-500 border border-primary-500/20"
                  )}>
                    {article.aiPersonaId ? (
                      <Sparkles className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                    {hasHighPlagiarism && (
                      <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-warning border-2 border-background rounded-full flex items-center justify-center animate-pulse" title="Yüksek İntihal Riski">
                        <AlertTriangle className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <p className="text-sm font-semibold line-clamp-2 text-foreground hover:text-primary-500 transition-colors break-words whitespace-normal flex-1 min-w-0">
                        {article.title}
                      </p>
                      {article.aiPersonaId && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/20 text-primary-500 flex items-center gap-0.5">
                          <Sparkles className="h-2 w-2" /> AI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {article.category?.name || "Kategorisiz"} · {formatDate(article.publishedAt || article.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Scores & Metrics */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 lg:gap-4 w-full lg:w-auto pt-3 lg:pt-0 border-t border-border/40 lg:border-t-0 shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isAnalyzed ? (
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted transition-all cursor-pointer outline-none focus-ring"
                        title="Detaylı Analiz Raporunu Gör"
                      >
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                          getScoreColor(article.plagiarismRate ?? 0, true)
                        )}>
                          İntihal: %{article.plagiarismRate}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                          getScoreColor(article.qualityScore ?? 0)
                        )}>
                          Kalite: {article.qualityScore}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                          <Gauge className="h-3 w-3" /> Rapor
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-dashed border-border hover:border-primary-500/40 hover:bg-primary-500/5 hover:text-primary-500 text-muted-foreground transition-all cursor-pointer outline-none focus-ring"
                      >
                        <Sparkles className="h-3 w-3" /> Analiz Et
                      </button>
                    )}

                    <Badge variant={variant} className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{label}</Badge>
                    
                    <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <Eye className="h-3.5 w-3.5" /> {article.viewCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 border-t border-border/30 lg:border-t-0 pt-2 lg:pt-0 w-full lg:w-auto justify-end lg:border-l lg:border-border lg:pl-3">
                    <Link
                      href={`/author/articles/${article.id}/edit`}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-border/30"
                      title="Düzenle"
                    >
                      <Pencil className="h-4.5 w-4.5" />
                    </Link>
                    <DeleteArticleButton articleId={article.id} articleTitle={article.title} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Analysis Modal */}
      {selectedArticle && (
        <ArticleAnalysisModal
          articleId={selectedArticle.id}
          articleTitle={selectedArticle.title}
          userRole="AUTHOR"
          initialData={{
            plagiarismRate: selectedArticle.plagiarismRate,
            seoScore: selectedArticle.seoScore,
            readabilityScore: selectedArticle.readabilityScore,
            qualityScore: selectedArticle.qualityScore,
            analysisReport: selectedArticle.analysisReport
          }}
          onClose={() => setSelectedArticle(null)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}
    </div>
  );
}
