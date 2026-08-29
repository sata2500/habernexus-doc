"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, CheckCircle2 } from "lucide-react";

interface TldrModalProps {
  title: string;
  content: string;
}

export function TldrModal({ title, content }: TldrModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string[] | null>(null);

  const fetchSummary = async () => {
    if (summary) {
      setIsOpen(true);
      return;
    }

    setIsOpen(true);
    setLoading(true);

    try {
      // HTML strip
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";

      const res = await fetch("/api/ai-writer/tldr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text: plainText.slice(0, 3000) }),
      });

      const data = await res.json();
      if (data.bullets && Array.isArray(data.bullets)) {
        setSummary(data.bullets);
      } else {
        // Fallback: simple sentence extraction
        const sentences = plainText
          .split(/(?<=[.?!])\s+/)
          .filter((s) => s.length > 20)
          .slice(0, 3);
        setSummary(sentences.length > 0 ? sentences : ["Makale özeti oluşturulurken bir hata meydana geldi."]);
      }
    } catch {
      setSummary(["Makale okundu, detaylar haber metninde mevcuttur."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={fetchSummary}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 text-xs font-bold transition-all border border-primary-500/20 cursor-pointer shadow-xs active:scale-95"
      >
        <Sparkles className="h-4 w-4" />
        AI ile 3 Maddede Özetle
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border/60 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-2 text-primary-500">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-bold font-display text-lg text-foreground">Hızlı AI Özeti (TL;DR)</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs font-semibold text-muted-foreground line-clamp-1">“{title}”</p>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                <p className="text-sm font-semibold">Yapay zeka makaleyi özetliyor...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary?.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/30">
                    <CheckCircle2 className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium leading-relaxed text-foreground">{bullet}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
