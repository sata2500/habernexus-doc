"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, CheckCircle2, Loader2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TldrCardProps {
  articleId: string;
  content: string;
  /** Daha önce üretilip saklanmış özet (varsa) */
  initialBullets?: string[] | null;
}

function fallbackSentences(html: string) {
  const div = document.createElement("div");
  // Blok sonlarında satır kır; ara başlıklar (HTML ya da Markdown) özete girmesin
  div.innerHTML = html.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "").replace(/<\/(p|li|blockquote)>/gi, "$&\n");
  const text = (div.textContent || "")
    .split("\n")
    .filter((line) => !/^\s*#{1,6}\s/.test(line))
    .join(" ")
    .replace(/[*_`]+/g, "");
  return text.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.length > 20).slice(0, 3);
}

/**
 * Haberin 3 maddelik yapay zekâ özeti. Özet sunucuda haber başına bir kez üretilip saklanır;
 * sonraki okuyucular (ve aynı okuyucu) hazır özeti alır.
 */
export function TldrCard({ articleId, content, initialBullets }: TldrCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string[] | null>(initialBullets?.length ? initialBullets : null);
  const [isFallback, setIsFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = async () => {
    if (summary || loading) {
      setIsExpanded((v) => !v);
      return;
    }
    setIsExpanded(true);
    setLoading(true);
    try {
      const res = await fetch("/api/ai-writer/tldr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const data = (await res.json().catch(() => ({}))) as { bullets?: unknown };
      const bullets = Array.isArray(data.bullets) ? data.bullets.filter((b): b is string => typeof b === "string") : [];
      if (res.ok && bullets.length) {
        setSummary(bullets);
      } else {
        // Servis kullanılamazsa haberin ilk cümleleri gösterilir (saklanmaz, sonra tekrar denenir)
        const sentences = fallbackSentences(content);
        setSummary(sentences.length ? sentences : ["Özet şu anda hazırlanamadı. Ayrıntılar haber metninde."]);
        setIsFallback(true);
      }
    } catch {
      setSummary(["Özet şu anda hazırlanamadı. Ayrıntılar haber metninde."]);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    void navigator.clipboard?.writeText(summary.map((b) => `• ${b}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/5 via-card to-background shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 pr-2 hover:bg-primary-500/5 transition-colors">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isExpanded}
          className="flex-1 min-w-0 px-4 py-3 flex items-center gap-3 text-left cursor-pointer"
        >
          <span className="h-8 w-8 shrink-0 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold font-display text-foreground">Yapay Zekâ ile Hızlı Özet</span>
            <span className="block text-xs text-muted-foreground truncate">
              {isExpanded ? "Daraltmak için dokunun" : "Haberin 3 kritik noktası"}
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </button>
        {summary && isExpanded && !loading && (
          <button
            type="button"
            onClick={handleCopy}
            title="Özeti kopyala"
            aria-label="Özeti kopyala"
            className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/40 animate-in fade-in slide-in-from-top-2 duration-300" aria-live="polite">
          {loading ? (
            <div className="py-5 flex items-center justify-center gap-2.5 text-muted-foreground text-xs font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              <span>Özet hazırlanıyor…</span>
            </div>
          ) : (
            <ul className="space-y-2 pt-3">
              {summary?.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card/80 border border-border/40">
                  <CheckCircle2 className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium leading-relaxed text-foreground">{bullet}</p>
                </li>
              ))}
              {isFallback && <li className="text-[11px] text-muted-foreground px-1">Yapay zekâ özeti şu an hazır değil; haberin ilk cümleleri gösteriliyor.</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
