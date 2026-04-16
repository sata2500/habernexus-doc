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
  Maximize2
} from "lucide-react";
import { deleteMedia } from "@/app/actions/admin-media";
import { useRouter } from "next/navigation";

interface MediaItem {
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
  const [media, setMedia] = useState(initialMedia);

  const handleOptimize = async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    
    try {
      const resp = await fetch(`/api/media/${id}/optimize`, { method: "POST" });
      const result = await resp.json();
      
      if (result.success) {
        // Optimistik güncelleme veya sayfayı yenile
        router.refresh();
      } else {
        alert("Optimizasyon başarısız: " + result.error);
      }
    } catch (err) {
      alert("Bir hata oluştu.");
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
    
    try {
      await deleteMedia(id);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {initialMedia.map((item) => (
        <Card key={item.id} className="group overflow-hidden flex flex-col border-border hover:border-primary-500/30 transition-all duration-300">
          {/* Görsel Önizleme */}
          <div className="relative aspect-video bg-muted overflow-hidden">
            <img 
              src={item.url} 
              alt={item.filename}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
              ) : item.status === "PROCESSING" || processingIds.has(item.id) ? (
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
              <button 
                onClick={() => handleDelete(item.id)}
                className="p-2 bg-red-500/80 hover:bg-red-500 rounded-xl text-white backdrop-blur-md transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Bilgiler */}
          <div className="p-4 flex-1 flex flex-col gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-tighter truncate">
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

              {item.status === "RAW" && !processingIds.has(item.id) && (
                <button 
                  onClick={() => handleOptimize(item.id)}
                  className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-primary-500/20"
                >
                  <Zap className="h-3 w-3 fill-current" />
                  OPTİMİZE ET
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {initialMedia.length === 0 && (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-3xl">
          <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium">Henüz medya yüklenmemiş.</p>
        </div>
      )}
    </div>
  );
}
