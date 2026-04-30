"use client";

import { useState, useMemo, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { 
  Zap, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  Maximize2,
  Search,
  Filter,
  Image as ImageIcon,
  CheckSquare,
  Square,
  X
} from "lucide-react";
import { deleteMedia, bulkDeleteMedia } from "@/app/actions/admin-media";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  size: number;
  status: "RAW" | "PROCESSING" | "OPTIMIZED" | "FAILED";
  width: number | null;
  height: number | null;
  createdAt: string;
  user: { name: string };
}

export function MediaManagerClient({ initialMedia }: { initialMedia: MediaItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Arama ve Filtreleme
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Filtrelenmiş Medya
  const filteredMedia = useMemo(() => {
    return initialMedia.filter(m => {
      const matchesSearch = m.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [initialMedia, searchQuery, statusFilter]);

  // Seçim İşlemleri
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectByStatus = (status: "RAW" | "OPTIMIZED" | "FAILED") => {
    const ids = filteredMedia
      .filter(m => m.status === status)
      .map(m => m.id);
    setSelectedIds(new Set(ids));
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMedia.length && filteredMedia.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map(m => m.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Tekli İşlemler
  const handleOptimize = async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const resp = await fetch(`/api/media/${id}/optimize`, { method: "POST" });
      const result = await resp.json();
      if (!result.success) console.error(result.error);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu medyayı silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      try {
        await deleteMedia(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Silme işlemi başarısız.");
      }
    });
  };

  // Toplu İşlemler
  const handleBulkOptimize = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    
    const targetIds = Array.from(selectedIds).filter(id => {
      const item = initialMedia.find(m => m.id === id);
      return item?.status === "RAW";
    });

    for (const id of targetIds) {
      await handleOptimize(id);
    }

    setIsBulkProcessing(false);
    setSelectedIds(new Set());
    router.refresh();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} medyayı kalıcı olarak silmek istediğinize emin misiniz?`)) return;

    setIsBulkProcessing(true);
    try {
      await bulkDeleteMedia(ids);
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toplu silme başarısız.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "Bilinmiyor";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="relative pb-32">
      {/* Filtre ve Arama Barı */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-card border border-border rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Dosya adıyla ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {[
            { label: "Tümü", value: "ALL" },
            { label: "Ham", value: "RAW" },
            { label: "Optimize", value: "OPTIMIZED" },
            { label: "Hatalı", value: "FAILED" },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap",
                statusFilter === f.value 
                  ? "bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/20" 
                  : "bg-background border-border text-muted-foreground hover:border-primary-500/30"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seçim Yardımcıları */}
      <div className="flex flex-wrap items-center gap-3 mb-6 px-1">
        <button 
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
        >
          {selectedIds.size === filteredMedia.length && filteredMedia.length > 0 ? (
            <CheckSquare className="h-4 w-4 text-primary-500" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          Tümünü Seç
        </button>
        <div className="h-4 w-[1px] bg-border mx-1" />
        <button onClick={() => selectByStatus("RAW")} className="text-[10px] font-bold text-amber-600 hover:underline uppercase tracking-wider">Hamları Seç</button>
        <button onClick={() => selectByStatus("OPTIMIZED")} className="text-[10px] font-bold text-green-600 hover:underline uppercase tracking-wider">Optimize Edilenleri Seç</button>
        <button onClick={() => selectByStatus("FAILED")} className="text-[10px] font-bold text-red-600 hover:underline uppercase tracking-wider">Hatalıları Seç</button>
      </div>

      {/* Izgara Görünümü */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMedia.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isProcessing = processingIds.has(item.id);

          return (
            <Card 
              key={item.id} 
              className={cn(
                "group overflow-hidden flex flex-col border-border hover:border-primary-500/30 transition-all duration-300 relative",
                isSelected && "border-primary-500 ring-2 ring-primary-500/20 shadow-lg shadow-primary-500/10"
              )}
            >
              {/* Seçim Checkbox Overlay */}
              <div 
                onClick={() => toggleSelect(item.id)}
                className={cn(
                  "absolute top-3 right-3 z-20 h-6 w-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all",
                  isSelected 
                    ? "bg-primary-500 border-primary-500 text-white" 
                    : "bg-black/20 border-white/40 opacity-0 group-hover:opacity-100 backdrop-blur-md"
                )}
              >
                {isSelected && <CheckCircle2 className="h-4 w-4" />}
              </div>

              {/* Görsel Önizleme */}
              <div className="relative aspect-video bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={item.url} 
                  alt={item.filename}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
                    isSelected && "scale-105"
                  )}
                />
                
                {/* Durum Rozeti */}
                <div className="absolute top-3 left-3">
                  {item.status === "OPTIMIZED" ? (
                    <Badge className="bg-green-500/90 text-white border-0 flex gap-1 items-center backdrop-blur-md text-[10px]">
                       <CheckCircle2 className="h-3 w-3" /> Optimize
                    </Badge>
                  ) : item.status === "RAW" ? (
                    <Badge className="bg-amber-500/90 text-white border-0 flex gap-1 items-center backdrop-blur-md text-[10px]">
                       <Clock className="h-3 w-3" /> Ham (Raw)
                    </Badge>
                  ) : item.status === "PROCESSING" || isProcessing ? (
                    <Badge className="bg-primary-500/90 text-white border-0 flex gap-1 items-center backdrop-blur-md text-[10px]">
                       <Loader2 className="h-3 w-3 animate-spin" /> İşleniyor
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/90 text-white border-0 flex gap-1 items-center backdrop-blur-md text-[10px]">
                       <AlertCircle className="h-3 w-3" /> Başarısız
                    </Badge>
                  )}
                </div>

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-all"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </a>
                  {!isBulkProcessing && (
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-red-500/80 hover:bg-red-500 rounded-xl text-white backdrop-blur-md transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bilgiler */}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold truncate">
                    {item.filename.split("/").pop()}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(item.createdAt).toLocaleDateString("tr-TR")} • {item.user.name}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{formatSize(item.size)}</span>
                    {item.width && (
                       <span className="text-[10px] text-muted-foreground">{item.width}x{item.height}px</span>
                    )}
                  </div>

                  {item.status === "RAW" && !isProcessing && (
                    <button 
                      onClick={() => handleOptimize(item.id)}
                      disabled={isBulkProcessing}
                      className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-primary-500/20 disabled:opacity-50"
                    >
                      <Zap className="h-3 w-3 fill-current" />
                      OPTİMİZE ET
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredMedia.length === 0 && (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-3xl bg-muted/10">
          <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium text-sm">Arama kriterlerine uygun medya bulunamadı.</p>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-neutral-900 border border-neutral-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-8 backdrop-blur-xl">
            <div className="flex flex-col min-w-[120px]">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Toplu İşlem</span>
              <span className="text-sm font-semibold text-primary-400">{selectedIds.size} öğe seçildi</span>
            </div>
            
            <div className="h-8 w-[1px] bg-neutral-800" />

            <div className="flex gap-3">
              <button
                onClick={handleBulkOptimize}
                disabled={isBulkProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
              >
                {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                Optimize Et
              </button>
              
              <button
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Sil
              </button>

              <button
                onClick={clearSelection}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"
                title="Seçimi Temizle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
