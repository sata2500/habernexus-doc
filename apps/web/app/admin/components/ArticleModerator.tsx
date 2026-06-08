"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { 
  updateArticleStatus, 
  deleteArticle, 
  bulkUpdateArticleStatus, 
  bulkDeleteArticles 
} from "../actions";
import { Badge } from "@/components/ui/Badge";
import { 
  Loader2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search, 
  CheckSquare, 
  Square, 
  MoreHorizontal,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ArticleWithRelations } from "@/lib/types";
import { ArticleAnalysisModal } from "@/components/article/ArticleAnalysisModal";

type Article = ArticleWithRelations;

function getStatusInfo(status: string) {
  if (status === "PUBLISHED") return { label: "Yayında", variant: "success" as const, icon: <CheckCircle2 className="h-3 w-3" /> };
  if (status === "DRAFT")     return { label: "Taslak",  variant: "warning" as const, icon: <AlertCircle className="h-3 w-3" /> };
  return { label: status, variant: "default" as const, icon: <XCircle className="h-3 w-3" /> };
}

const getScoreColor = (score: number, isPlagiarism = false) => {
  if (isPlagiarism) {
    if (score <= 30) return "text-success bg-success/10 border-success/20 animate-none";
    if (score <= 60) return "text-warning bg-warning/10 border-warning/20 animate-none";
    return "text-error bg-error/10 border-error/20 font-black animate-pulse";
  } else {
    if (score >= 70) return "text-success bg-success/10 border-success/20";
    if (score >= 40) return "text-warning bg-warning/10 border-warning/20";
    return "text-error bg-error/10 border-error/20";
  }
};


export function ArticleModerator({ articles }: { articles: Article[] }) {
  const [localArticles, setLocalArticles] = useState<Article[]>(articles);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  
  // Arama ve Filtreleme State'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Seçim State'i
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync prop updates to local state
  useEffect(() => {
    setLocalArticles(articles);
  }, [articles]);

  const handleAnalysisComplete = (updatedArticle: any) => {
    setLocalArticles((prev) =>
      prev.map((art) => (art.id === updatedArticle.id ? { ...art, ...updatedArticle } : art))
    );
    if (selectedArticle && selectedArticle.id === updatedArticle.id) {
      setSelectedArticle({ ...selectedArticle, ...updatedArticle });
    }
  };

  // Kategorileri çıkar (filtre için)
  const categories = useMemo(() => {
    const cats = new Map();
    localArticles.forEach(a => {
      if (a.category) cats.set(a.category.id, a.category.name);
    });
    return Array.from(cats.entries());
  }, [localArticles]);

  // Filtrelenmiş liste
  const filteredArticles = useMemo(() => {
    return localArticles.filter(article => {
      const authorName = article.author.name || "İsimsiz Yazar";
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           authorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || article.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || article.category?.id === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [localArticles, searchQuery, statusFilter, categoryFilter]);

  // Seçim işlemleri
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredArticles.length && filteredArticles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredArticles.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Tekli İşlemler
  const handleStatus = (id: string, newStatus: string) => {
    setActionId(id + "-status");
    startTransition(async () => {
      await updateArticleStatus(id, newStatus);
      setActionId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bu makaleyi kalıcı olarak silmek istediğinizden emin misiniz?")) return;
    setActionId(id + "-delete");
    startTransition(async () => {
      await deleteArticle(id);
      setActionId(null);
    });
  };

  // Toplu İşlemler
  const handleBulkStatus = (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    startTransition(async () => {
      await bulkUpdateArticleStatus(ids, status);
      setSelectedIds(new Set());
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} makaleyi kalıcı olarak silmek istediğinizden emin misiniz?`)) return;

    startTransition(async () => {
      await bulkDeleteArticles(ids);
      setSelectedIds(new Set());
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filtre Barı */}
      <div className="flex flex-col md:flex-row gap-4 glass-strong border border-border/50 p-4 rounded-3xl shadow-soft">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Başlık veya yazar ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-initial px-3 py-2 bg-background/50 border border-border rounded-xl text-sm focus:border-primary-500 outline-none cursor-pointer font-semibold min-w-0"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="PUBLISHED">Yayında</option>
            <option value="DRAFT">Taslak</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 md:flex-initial px-3 py-2 bg-background/50 border border-border rounded-xl text-sm focus:border-primary-500 outline-none md:max-w-[150px] cursor-pointer font-semibold min-w-0"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toplu İşlem Barı (Sadece seçim varsa görünür) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between glass-strong bg-primary-500/90 border border-primary-400/20 text-white p-3 rounded-2xl shadow-glow backdrop-blur-xl animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 px-2">
            <span className="text-sm font-bold">{selectedIds.size} öğe seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatus("PUBLISHED")}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Eye className="h-3.5 w-3.5" /> Yayınla
            </button>
            <button
              onClick={() => handleBulkStatus("DRAFT")}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <EyeOff className="h-3.5 w-3.5" /> Taslağa Al
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-error hover:opacity-90 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="glass-strong border border-border/50 rounded-[2.5rem] overflow-hidden shadow-soft">
        <div className="hidden sm:flex items-center gap-4 p-4 border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <button 
            onClick={toggleSelectAll}
            className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
          >
            {selectedIds.size === filteredArticles.length && filteredArticles.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-primary-500" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1">Makale Bilgisi</div>
          <div className="hidden md:block w-24">İstatistik</div>
          <div className="hidden md:block w-40">Analiz & Kalite</div>
          <div className="w-24">Durum</div>
          <div className="w-20 text-right">İşlemler</div>
        </div>

        <div className="divide-y divide-border">
          {filteredArticles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">
              Arama kriterlerine uygun makale bulunamadı.
            </div>
          ) : (
            filteredArticles.map((article) => {
              const { label, variant, icon } = getStatusInfo(article.status);
              const isLoading = actionId?.startsWith(article.id) || isPending;
              const isSelected = selectedIds.has(article.id);
              const authorName = article.author.name || "İsimsiz Yazar";
              const isAnalyzed = article.qualityScore !== null;

              return (
                <div 
                  key={article.id} 
                  className={cn(
                    "flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 transition-all duration-300 group",
                    isSelected ? "bg-[var(--color-primary-500)]/5" : "bg-background/30 hover:bg-primary-500/5"
                  )}
                >
                  <button 
                    onClick={() => toggleSelect(article.id)}
                    className="p-1 hover:bg-muted rounded transition-colors cursor-pointer mt-1 sm:mt-0 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary-500" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                    {/* Title & info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <p className="text-sm font-bold line-clamp-2 group-hover:text-[var(--color-primary-500)] transition-colors flex-1 min-w-0 break-words whitespace-normal">
                          {article.title}
                        </p>

                        {article.aiPersonaId && (
                          <span className="shrink-0 text-[8px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/20 text-primary-500 flex items-center gap-0.5" title="Yapay Zeka Makalesi">
                            <Sparkles className="h-2 w-2" /> AI
                          </span>
                        )}
                        {isAnalyzed && (article.plagiarismRate ?? 0) > 30 && (
                          <span className="shrink-0 text-[8px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded bg-warning/10 border border-warning/20 text-warning flex items-center gap-0.5 animate-pulse" title="Yüksek İntihal Riski">
                            <AlertTriangle className="h-2.5 w-2.5" /> Risk
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        <span className="font-semibold">{authorName}</span>
                        <span>•</span>
                        {article.category && (
                          <span 
                            className="px-1.5 py-0.5 rounded-md bg-muted/30 border border-border/50 font-bold"
                            style={{ color: article.category.color || undefined }}
                          >
                            {article.category.name}
                          </span>
                        )}
                        <span className="sm:hidden font-bold">• {article.viewCount.toLocaleString()} okunma</span>
                      </div>
                    </div>

                    {/* Stats (Desktop only) */}
                    <div className="hidden md:flex items-center gap-1.5 w-24 text-xs font-bold text-muted-foreground bg-muted/30 border border-border/50 rounded-lg px-2 py-1 justify-center shrink-0">
                      <ArrowUpDown className="h-3 w-3 text-primary-500" />
                      {article.viewCount.toLocaleString()}
                    </div>

                    {/* Quality scores (Desktop only) */}
                    <div className="hidden md:flex items-center gap-2 w-40 text-xs shrink-0">
                      {isAnalyzed ? (
                        <div className="flex gap-1.5 flex-wrap">
                          <span className={cn(
                            "px-2 py-1 rounded font-bold border",
                            (article.qualityScore ?? 0) >= 80 ? "bg-success/10 border-success/20 text-success" :
                            (article.qualityScore ?? 0) >= 50 ? "bg-warning/10 border-warning/20 text-warning" :
                            "bg-error/10 border-error/20 text-error"
                          )}>
                            QS: {article.qualityScore}
                          </span>
                          {(article.plagiarismRate ?? 0) > 0 && (
                            <span className={cn(
                              "px-2 py-1 rounded font-bold border",
                              (article.plagiarismRate ?? 0) <= 20 ? "bg-success/10 border-success/20 text-success" :
                              (article.plagiarismRate ?? 0) <= 40 ? "bg-warning/10 border-warning/20 text-warning" :
                              "bg-error/10 border-error/20 text-error"
                            )}>
                              P: %{article.plagiarismRate}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Analiz Yok</span>
                      )}
                    </div>

                    {/* Actions & Status (Responsive wrap on mobile) */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 w-full sm:w-auto shrink-0">
                      <div className="w-24 sm:shrink-0">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border w-full sm:w-auto justify-center",
                          variant === "success" ? "bg-success/10 border-success/25 text-success" :
                          variant === "warning" ? "bg-warning/10 border-warning/25 text-warning" :
                          "bg-muted border-border/50 text-muted-foreground"
                        )}>
                          {icon}
                          {label}
                        </span>

                      </div>

                      <div className="w-20 flex items-center justify-end gap-1 shrink-0">
                        {isLoading ? (
                          <span className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <button
                              onClick={() => handleStatus(article.id, article.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")}
                              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title={article.status === "PUBLISHED" ? "Taslağa al" : "Yayınla"}
                            >
                              {article.status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(article.id)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-error/10 text-muted-foreground hover:text-error border border-transparent hover:border-error/25 transition-colors cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Article Quality/Plagiarism Report Modal */}
      {selectedArticle && (
        <ArticleAnalysisModal
          articleId={selectedArticle.id}
          articleTitle={selectedArticle.title}
          userRole="ADMIN"
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
