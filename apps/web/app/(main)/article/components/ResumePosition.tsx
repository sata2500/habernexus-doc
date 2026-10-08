"use client";

import { useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";

/** "Kaldığın yerden devam et" bağlantıları haberi #devam-<yüzde> ile açar */
export const RESUME_HASH = /^#devam-(\d{1,3})$/;
export const resumeHref = (slug: string, progress: number) => `/article/${slug}#devam-${Math.round(progress)}`;

/** Okunan oran (0-100) için kaydırma konumu: ölçüm lib/reading-progress → measureArticleProgress ile aynı */
function scrollTopFor(progress: number) {
  const body = document.getElementById("article-body");
  if (!body) return null;
  const end = document.getElementById("article-end");
  const top = body.getBoundingClientRect().top + window.scrollY;
  const finish = (end ? end.getBoundingClientRect().top + 80 : body.getBoundingClientRect().bottom) + window.scrollY;
  // Birkaç satır geriden başlat (bağlam kaybolmasın)
  const q = Math.max(0, progress - 4) / 100;
  return Math.max(0, top - window.innerHeight + q * (finish - top));
}

/** Haber "kaldığın yerden" açıldıysa o konuma kaydırır ve baştan okuma seçeneği sunar */
export function ResumePosition() {
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    const m = window.location.hash.match(RESUME_HASH);
    if (!m) return;
    const progress = Math.min(100, Number(m[1]));
    history.replaceState(null, "", window.location.pathname + window.location.search);
    const go = () => {
      const y = scrollTopFor(progress);
      if (y !== null) window.scrollTo({ top: y, behavior: "instant" });
    };
    // Görseller yüklendikçe sayfa uzayabilir; kısa bir süre sonra konum yeniden hesaplanır
    const raf = requestAnimationFrame(() => {
      go();
      setResumed(true);
    });
    const again = setTimeout(go, 700);
    const hide = setTimeout(() => setResumed(false), 8000);
    return () => { cancelAnimationFrame(raf); clearTimeout(again); clearTimeout(hide); };
  }, []);

  if (!resumed) return null;
  return (
    <div role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur px-3 py-1.5 text-xs font-semibold shadow-lg">
      <BookOpen className="h-4 w-4 text-primary-500" aria-hidden="true" />
      Kaldığın yerden devam ediyorsun
      <button type="button" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setResumed(false); }} className="text-primary-500 hover:underline">
        Baştan oku
      </button>
      <button type="button" onClick={() => setResumed(false)} aria-label="Kapat" className="p-0.5 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}
