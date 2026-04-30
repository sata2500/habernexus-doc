"use client";

import { useState, useTransition, useMemo } from "react";
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
  Filter, 
  CheckSquare, 
  Square, 
  MoreHorizontal,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ArticleWithRelations } from "@/lib/types";

type Article = ArticleWithRelations;

function getStatusInfo(status: string) {
  if (status === "PUBLISHED") return { label: "Yayında", variant: "success" as const, icon: <CheckCircle2 className="h-3 w-3" /> };
  if (status === "DRAFT")     return { label: "Taslak",  variant: "warning" as const, icon: <AlertCircle className="h-3 w-3" /> };
  return { label: status, variant: "default" as const, icon: <XCircle className="h-3 w-3" /> };
}

export function ArticleModerator({ articles }: { articles: Article[] }) {
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  
  // Arama ve Filtreleme State'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Seçim State'i
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Kategorileri çıkar (filtre için)
  const categories = useMemo(() => {
    const cats = new Map();
    articles.forEach(a => {
      if (a.category) cats.set(a.category.id, a.category.name);
    });
    return Array.from(cats.entries());
  }, [articles]);

  // Filtrelenmiş liste
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const authorName = article.author.name || "İsimsiz Yazar";
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           authorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || article.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || article.category?.id === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [articles, searchQuery, statusFilter, categoryFilter]);

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
    <div className="space-y-4">
      {/* Filtre Barı */}
      <div className="flex flex-col md:flex-row gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Başlık veya yazar ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:border-primary-500 outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="PUBLISHED">Yayında</option>
            <option value="DRAFT">Taslak</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-sm focus:border-primary-500 outline-none max-w-[150px]"
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
        <div className="flex items-center justify-between bg-primary-600 text-white p-3 rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 px-2">
            <span className="text-sm font-bold">{selectedIds.size} öğe seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatus("PUBLISHED")}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5" /> Yayınla
            </button>
            <button
              onClick={() => handleBulkStatus("DRAFT")}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <EyeOff className="h-3.5 w-3.5" /> Taslağa Al
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <button 
            onClick={toggleSelectAll}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            {selectedIds.size === filteredArticles.length && filteredArticles.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-primary-500" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1">Makale Bilgisi</div>
          <div className="hidden md:block w-24">İstatistik</div>
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

              return (
                <div 
                  key={article.id} 
                  className={cn(
                    "flex items-center gap-4 p-4 transition-colors group",
                    isSelected ? "bg-primary-500/5" : "bg-background hover:bg-muted/30"
                  )}
                >
                  <button 
                    onClick={() => toggleSelect(article.id)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-primary-500" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary-600 transition-colors">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="font-medium">{authorName}</span>
                      <span>•</span>
                      {article.category && (
                        <span 
                          className="px-1.5 py-0.5 rounded-md bg-muted font-bold"
                          style={{ color: article.category.color || undefined }}
                        >
                          {article.category.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-1.5 w-24 text-xs font-medium text-muted-foreground">
                    <ArrowUpDown className="h-3 w-3" />
                    {article.viewCount.toLocaleString()}
                  </div>

                  <div className="w-24">
                    <Badge variant={variant} className="gap-1 px-2 py-0.5 text-[10px]">
                      {icon}
                      {label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-end gap-1 w-20 shrink-0">
                    {isLoading && actionId?.startsWith(article.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
