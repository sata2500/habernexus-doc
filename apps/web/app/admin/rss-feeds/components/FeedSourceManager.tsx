"use client";

import { useState, useMemo, useTransition } from "react";
import { Plus, Trash2, RefreshCw, Power, ExternalLink, Loader2, Rss, Search, Filter, CheckSquare, Square, X } from "lucide-react";
import {
  createRssSource,
  deleteRssSource,
  updateRssSource,
  triggerRssScan,
} from "../actions";

type Source = {
  id: string;
  name: string;
  url: string;
  categoryHint: string | null;
  language: string;
  isActive: boolean;
  lastFetchedAt: Date | null;
  fetchError: string | null;
  _count: { items: number };
};

interface Props {
  sources: Source[];
}

export function FeedSourceManager({ sources: initialSources }: Props) {
  const [sources, setSources] = useState(initialSources);
  const [isAdding, setIsAdding] = useState(false);
  const [scanning, setScanningId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "error">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    url: "",
    categoryHint: "",
    language: "tr",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus === "active" && !s.isActive) return false;
      if (filterStatus === "inactive" && s.isActive) return false;
      if (filterStatus === "error" && !s.fetchError) return false;
      return true;
    });
  }, [sources, searchQuery, filterStatus]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    setError("");

    const res = await createRssSource({
      name: form.name,
      url: form.url,
      categoryHint: form.categoryHint || undefined,
      language: form.language,
    });

    if (res.success) {
      setForm({ name: "", url: "", categoryHint: "", language: "tr" });
      setIsAdding(false);
      setSuccess("Kaynak eklendi! Etkili olması için sayfayı yenileyin veya bir süre bekleyin.");
      setTimeout(() => setSuccess(""), 4000);
    } else {
      setError(res.error || "Bir hata oluştu.");
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await updateRssSource(id, { isActive: !current });
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !current } : s))
    );
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" kaynağını ve tüm öğelerini silmek istediğinize emin misiniz?`)) return;
    await deleteRssSource(id);
    setSources((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleScan = async (id: string) => {
    setScanningId(id);
    const res = await triggerRssScan(id);
    setScanningId(null);
    if (res.success) {
      const added = "added" in res ? res.added : 0;
      const skipped = "skipped" in res ? res.skipped : 0;
      setSuccess(`Tarama tamamlandı: ${added} yeni, ${skipped} atlanan`);
      setTimeout(() => setSuccess(""), 5000);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredSources.length && filteredSources.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSources.map(s => s.id)));
    }
  };

  const handleBulkAction = (action: "delete" | "scan" | "enable" | "disable") => {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`${selectedIds.size} adet RSS kaynağını silmek istediğinize emin misiniz?`)) return;

    startTransition(async () => {
      const ids = Array.from(selectedIds);
      try {
        if (action === "delete") {
          await Promise.all(ids.map(id => deleteRssSource(id)));
          setSources(prev => prev.filter(s => !selectedIds.has(s.id)));
          setSelectedIds(new Set());
          setSuccess(`${ids.length} kaynak silindi.`);
        } else if (action === "enable" || action === "disable") {
          const isActive = action === "enable";
          await Promise.all(ids.map(id => updateRssSource(id, { isActive })));
          setSources(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, isActive } : s));
          setSuccess(`${ids.length} kaynak ${isActive ? "etkinleştirildi" : "devre dışı bırakıldı"}.`);
        } else if (action === "scan") {
          await Promise.all(ids.map(id => triggerRssScan(id)));
          setSuccess(`${ids.length} kaynak için tarama tamamlandı.`);
        }
      } catch (err) {
        setError("Toplu işlem sırasında bir hata oluştu.");
      }
      setTimeout(() => setSuccess(""), 5000);
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      {/* Add Form */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="glass-strong rounded-2xl p-6 border border-border shadow-soft space-y-4">
          <h3 className="font-bold font-(family-name:--font-outfit)">Yeni RSS Kaynağı Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kaynak Adı *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Örn: BBC News Türkçe" required className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">RSS Feed URL *</label>
              <input type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://example.com/rss" required className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kategori İpucu</label>
              <input type="text" value={form.categoryHint} onChange={(e) => setForm((f) => ({ ...f, categoryHint: e.target.value }))} placeholder="Örn: Teknoloji, Ekonomi..." className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dil</label>
              <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                <option value="tr">Türkçe</option>
                <option value="en">İngilizce</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all cursor-pointer">Kaydet</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 font-medium text-sm transition-all cursor-pointer">İptal</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => setIsAdding(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm shadow-lg shadow-primary-500/20 transition-all cursor-pointer shrink-0">
            <Plus className="h-4 w-4" />
            Kaynak Ekle
          </button>

          {/* Search & Filter Bar */}
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Kaynak adı veya URL ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative shrink-0">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full sm:w-auto pl-9 pr-8 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm appearance-none"
              >
                <option value="all">Tümü</option>
                <option value="active">Aktif Olanlar</option>
                <option value="inactive">Devre Dışı Olanlar</option>
                <option value="error">Hata Alanlar</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 px-4 rounded-2xl bg-foreground text-background shadow-2xl animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium mr-2">{selectedIds.size} seçili</span>
          <div className="h-4 w-px bg-background/20 mx-1"></div>
          
          <button onClick={() => handleBulkAction("scan")} disabled={isPending} className="p-2 rounded-xl hover:bg-background/20 text-blue-400 hover:text-blue-300 transition-colors" title="Seçilenleri Tara">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => handleBulkAction("enable")} disabled={isPending} className="p-2 rounded-xl hover:bg-background/20 text-green-400 hover:text-green-300 transition-colors" title="Seçilenleri Etkinleştir">
            <Power className="h-4 w-4" />
          </button>
          <button onClick={() => handleBulkAction("disable")} disabled={isPending} className="p-2 rounded-xl hover:bg-background/20 text-yellow-400 hover:text-yellow-300 transition-colors" title="Seçilenleri Devre Dışı Bırak">
            <Power className="h-4 w-4 rotate-180" />
          </button>
          
          <div className="h-4 w-px bg-background/20 mx-1"></div>
          <button onClick={() => handleBulkAction("delete")} disabled={isPending} className="p-2 rounded-xl hover:bg-background/20 text-red-400 hover:text-red-300 transition-colors" title="Seçilenleri Sil">
            <Trash2 className="h-4 w-4" />
          </button>
          
          <div className="h-4 w-px bg-background/20 mx-1"></div>
          <button onClick={() => setSelectedIds(new Set())} className="p-2 rounded-xl hover:bg-background/20 text-muted transition-colors" title="Seçimi İptal Et">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sources List */}
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-background relative">
        <div className="bg-muted/30 p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-muted-foreground hover:text-primary-600 transition-colors">
              {selectedIds.size === filteredSources.length && filteredSources.length > 0 ? (
                <CheckSquare className="h-5 w-5 text-primary-600" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm font-medium text-muted-foreground">Toplu Seçim</span>
          </div>
          <span className="text-xs text-muted-foreground">{filteredSources.length} sonuç</span>
        </div>

        {filteredSources.length === 0 ? (
          <div className="text-center py-20">
            <Rss className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium text-muted-foreground">Sonuç bulunamadı.</p>
          </div>
        ) : (
          filteredSources.map((source) => (
            <div
              key={source.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer ${
                selectedIds.has(source.id) ? "bg-primary-500/5 hover:bg-primary-500/10" : ""
              }`}
              onClick={(e) => {
                // Ignore clicks on buttons/links
                const target = e.target as HTMLElement;
                if (!target.closest('button') && !target.closest('a')) {
                  toggleSelection(source.id);
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  className="text-muted-foreground hover:text-primary-600 transition-colors"
                  onClick={() => toggleSelection(source.id)}
                >
                  {selectedIds.has(source.id) ? (
                    <CheckSquare className="h-5 w-5 text-primary-600" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    source.isActive
                      ? "bg-primary-500/10 text-primary-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Rss className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{source.name}</p>
                    {source.categoryHint && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600 font-semibold">
                        {source.categoryHint}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {source._count.items} öğe
                    </span>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary-600 transition-colors flex items-center gap-1 mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {source.url.slice(0, 50)}...
                  </a>
                  {source.fetchError && (
                    <p className="text-[10px] text-red-500 mt-0.5">⚠ {source.fetchError.slice(0, 60)}</p>
                  )}
                  {source.lastFetchedAt && !source.fetchError && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Son tarama: {new Date(source.lastFetchedAt).toLocaleString("tr-TR")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => handleScan(source.id)}
                  disabled={scanning === source.id || !source.isActive}
                  title="Şimdi Tara"
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-500 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {scanning === source.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleToggle(source.id, source.isActive)}
                  title={source.isActive ? "Devre Dışı Bırak" : "Etkinleştir"}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    source.isActive
                      ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(source.id, source.name)}
                  title="Kaynağı Sil"
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
