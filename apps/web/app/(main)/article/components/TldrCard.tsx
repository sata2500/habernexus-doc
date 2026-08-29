"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, CheckCircle2, Loader2, Copy, Check } from "lucide-react";

interface TldrCardProps {
  title: string;
  content: string;
}

export function TldrCard({ title, content }: TldrCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSummary = async () => {
    if (summary) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsExpanded(true);
    setLoading(true);

    try {
      // HTML strip
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";

      const res = await fetch("/api/ai-writer/tldr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text: plainText.slice(0, 3500) }),
      });

      const data = await res.json();
      if (data.bullets && Array.isArray(data.bullets)) {
        setSummary(data.bullets);
      } else {
        const sentences = plainText
          .split(/(?<=[.?!])\s+/)
          .filter((s) => s.length > 20)
          .slice(0, 3);
        setSummary(sentences.length > 0 ? sentences : ["Haber özeti çıkarılırken detay metne başvuruldu."]);
      }
    } catch {
      setSummary(["Makale okundu, detaylar haber metninde yer almaktadır."]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!summary) return;
    navigator.clipboard.writeText(summary.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-card to-background shadow-xs overflow-hidden transition-all duration-300">
      <button
        onClick={fetchSummary}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-primary-500/5 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-display text-foreground flex items-center gap-2">
              TL;DR Hızlı Yapay Zeka Özeti
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 font-semibold uppercase tracking-wider">
                3 Madde
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              {isExpanded ? "Özeti daraltmak için tıklayın" : "Haberin 3 kritik noktasını anında görün"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {summary && isExpanded && (
            <button
              onClick={handleCopy}
              title="Özeti Kopyala"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
          <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {loading ? (
            <div className="py-6 flex items-center justify-center gap-2.5 text-muted-foreground text-xs font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              <span>Yapay zeka makalenin en önemli maddelerini çıkarıyor...</span>
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {summary?.map((bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-card/80 border border-border/40 shadow-2xs hover:border-primary-500/30 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">{bullet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
