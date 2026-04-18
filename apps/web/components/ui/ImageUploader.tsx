"use client";

import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  type: "profile" | "article";
  className?: string;
  aspectRatio?: "square" | "video";
  autoOptimize?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  type,
  className,
  aspectRatio = "video",
  autoOptimize = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // 1. Doğrudan Vercel Blob'a yükleme (Client-side)
      const newBlob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ type }),
      });

      let finalUrl = newBlob.url;

      // 2. Eğer otomatik optimizasyon istenmişse sunucuyu tetikle
      if (autoOptimize) {
         try {
           const optResp = await fetch("/api/media/optimize-by-url", {
             method: "POST",
             body: JSON.stringify({ url: finalUrl }),
           });
           const optResult = await optResp.json();
           if (optResult.success && optResult.url) {
             finalUrl = optResult.url;
           }
         } catch (optErr) {
           console.warn("Otomatik optimizasyon başarısız, ham görsel kullanılacak.");
         }
      }

      onChange(finalUrl);
    } catch (err) {
      console.error("Yükleme hatası:", err);
      setError(err instanceof Error ? err.message : "Görsel yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed border-border rounded-2xl overflow-hidden transition-all duration-300",
          "hover:border-primary-500/50 hover:bg-muted/30",
          aspectRatio === "square" ? "aspect-square" : "aspect-video",
          value ? "border-solid" : "p-8 flex flex-col items-center justify-center gap-3",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        {value ? (
          <>
            <img 
              src={value} 
              alt="Yüklenen görsel" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/30 transition-colors"
                title="Değiştir"
              >
                <Upload className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="p-2 bg-red-500/80 backdrop-blur-md rounded-xl text-white hover:bg-red-500 transition-colors"
                title="Sil"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center border border-primary-500/20 group-hover:scale-110 transition-transform">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{uploading ? "Yükleniyor..." : "Görsel Seç"}</p>
              <p className="text-xs text-muted-foreground mt-1">Sürükle bırak veya tıkla</p>
            </div>
          </>
        )}
        
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleUpload} 
          className="hidden"
        />

        {uploading && (
           <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
             <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
           </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-medium text-red-500 px-1">{error}</p>
      )}
    </div>
  );
}
