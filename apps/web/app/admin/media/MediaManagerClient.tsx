"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { 
  Zap, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  FileIcon,
  Maximize2,
  Image as ImageIcon
} from "lucide-react";
import { deleteMedia } from "@/app/actions/admin-media";
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
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllRaw = () => {
    const rawIds = initialMedia
      .filter(m => m.status === "RAW")
      .map(m => m.id);
    setSelectedIds(new Set(rawIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

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

  const handleBulkOptimize = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    
    // Sadece RAW olanları seçilenler içinden ayıkla
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

  const handleDelete = async (id: string) => {
    if (!confirm("Bu medyayı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteMedia(id);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Silme işlemi başarısız.";
      alert(message);
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
    <div className="relative pb-24">
      {/* Üst İşlem Butonları */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={selectAllRaw}
          className="text-xs font-semibold px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
        >
          Tüm Hamları Seç
        </button>
        {selectedIds.size > 0 && (
          <button 
            onClick={clearSelection}
            className="text-xs font-semibold px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
          >
            Seçimi Temizle ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {initialMedia.map((item) => {
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
              {/* Seçim Checkbox */}
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
                    <Badge className="bg-green-500/90 text-white border-0 flex gap-1 items-center backdrop-blur-md">
                       <CheckCircle2 className="h-3 w-3" /> Optimize
                    </Badge>
                  ) : item.status === "RAW" ? (
                    <Badge className="bg-amber-500/90 text-white border-0 flex gap-1 items-center backdrop-blur-md">
                       <Clock className="h-3 w-3" /> Ham (Raw)
                    </Badge>
                  ) : item.status === "PROCESSING" || isProcessing ? (
                    <Badge className="bg-primary-500/90 text-white border-0 flex gap-1 items-center backdrop-blur-md">
                       <Loader2 className="h-3 w-3 animate-spin" /> İşleniyor
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/90 text-white border-0 flex gap-1 items-center backdrop-blur-md">
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
                  <span className="text-xs font-semibold truncate">
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

      {initialMedia.length === 0 && (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-3xl">
          <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium">Henüz medya yüklenmemiş.</p>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-neutral-900 border border-neutral-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-8 backdrop-blur-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Toplu İşlem</span>
              <span className="text-sm font-semibold">{selectedIds.size} öğe seçildi</span>
            </div>
            
            <div className="h-8 w-[1px] bg-neutral-800" />

            <div className="flex gap-3">
              <button
                onClick={handleBulkOptimize}
                disabled={isBulkProcessing}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
              >
                {isBulkProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-current" />
                    Seçilenleri Optimize Et
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
