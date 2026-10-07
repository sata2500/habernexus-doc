"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, CircleAlert, Gauge, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { atesmanLevel, readabilityScore, seoChecks, seoScore, textStats, type CheckStatus } from "@/lib/analysis/metrics";

const ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />,
  warn: <CircleAlert className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />,
  fail: <XCircle className="h-3.5 w-3.5 text-error shrink-0 mt-0.5" />,
};
const tone = (v: number) => (v >= 80 ? "text-success" : v >= 60 ? "text-warning" : "text-error");

// Editörde yönetilmeyen alanın kontrolü (adres ilk kayıtta başlıktan oluşur)
const HIDDEN = new Set(["slug"]);

/**
 * Yazarken anlık SEO ve okunabilirlik kontrolü. Analizdeki ölçümlerle aynı kuralları kullanır;
 * yapay zekâ çağırmaz, tamamen tarayıcıda çalışır.
 */
export function LiveSeoPanel({ title, excerpt, content, coverImage, tags }: { title: string; excerpt: string; content: string; coverImage: string; tags: string[] }) {
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(true);
  // Gövde her tuşta değişir; hesaplama yazmayı yavaşlatmasın diye ertelenir
  const deferredContent = useDeferredValue(content);

  const result = useMemo(() => {
    const stats = textStats(deferredContent);
    const checks = seoChecks({ title, excerpt, content: deferredContent, coverImage, tags, focusKeyword: keyword || null }, stats).filter((c) => !HIDDEN.has(c.id));
    return { stats, checks, seo: seoScore(checks), readability: readabilityScore(stats) };
  }, [title, excerpt, deferredContent, coverImage, tags, keyword]);

  const failing = result.checks.filter((c) => c.status !== "pass").length;

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-2 p-4 text-left cursor-pointer">
        <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 text-sm font-semibold">SEO ve okunabilirlik</span>
        <span className={cn("text-xs font-bold tabular-nums", tone(result.seo))}>SEO {result.seo}</span>
        {/* Çok kısa metinde okunabilirlik ölçümü anlamlı değil */}
        <span className={cn("text-xs font-bold tabular-nums", result.stats.words < 50 ? "text-muted-foreground" : tone(result.readability))}>
          Okunur {result.stats.words < 50 ? "—" : result.readability}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="focus-keyword" className="text-xs font-semibold">Odak ifade</label>
            <input
              id="focus-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ör. merkez bankası faiz kararı"
              className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:border-primary-500"
            />
            <p className="text-[11px] text-muted-foreground">Okurun bu haberi ararken yazacağı ifade. Boşsa başlıktan tahmin edilir.</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ateşman {result.stats.atesman} ({atesmanLevel(result.stats.atesman)}) · ort. cümle {result.stats.avgSentenceWords} kelime
            {failing > 0 && <> · <span className="font-semibold text-foreground">{failing} öneri</span></>}
          </p>
          <ul className="space-y-1.5">
            {result.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-xs">
                {ICON[c.status]}
                <span className="min-w-0">
                  <span className="font-medium">{c.label}</span> <span className="text-muted-foreground">· {c.detail}</span>
                  {c.status !== "pass" && c.fix && <span className="block text-muted-foreground">{c.fix}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
