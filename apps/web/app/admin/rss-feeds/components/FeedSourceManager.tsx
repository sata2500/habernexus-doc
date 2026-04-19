"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCw, Power, ExternalLink, Loader2, Rss } from "lucide-react";
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
  const [form, setForm] = useState({
    name: "",
    url: "",
    categoryHint: "",
    language: "tr",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setSuccess("Kaynak eklendi! Sayfayı yenileyin veya tarama başlatın.");
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

  return (
    <div className="space-y-6">
      {/* Messages */}
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
        <form
          onSubmit={handleAdd}
          className="glass-strong rounded-2xl p-6 border border-border shadow-soft space-y-4"
        >
          <h3 className="font-bold font-(family-name:--font-outfit)">Yeni RSS Kaynağı Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kaynak Adı *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Örn: BBC News Türkçe"
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">RSS Feed URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com/rss"
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kategori İpucu</label>
              <input
                type="text"
                value={form.categoryHint}
                onChange={(e) => setForm((f) => ({ ...f, categoryHint: e.target.value }))}
                placeholder="Örn: Teknoloji, Ekonomi..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Dil</label>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="tr">Türkçe</option>
                <option value="en">İngilizce</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all cursor-pointer"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-5 py-2 rounded-xl bg-muted hover:bg-muted/80 font-medium text-sm transition-all cursor-pointer"
            >
              İptal
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm shadow-lg shadow-primary-500/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Kaynak Ekle
        </button>
      )}

      {/* Sources List */}
      {sources.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed border-border">
          <Rss className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-medium text-muted-foreground">Henüz RSS kaynağı eklenmemiş.</p>
          <p className="text-sm text-muted-foreground mt-1">Yukarıdan kaynak ekleyerek başlayın.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-background">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
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
          ))}
        </div>
      )}
    </div>
  );
}
