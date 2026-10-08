"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Clock, Headphones } from "lucide-react";
import { ARTICLE_READ_EVENT, measureArticleProgress } from "@/lib/reading-progress";
import { getSessionServerSnapshot, getSessionSnapshot, subscribeSession } from "@/lib/article-session";

/**
 * Üstte ilerleme çubuğu ve sağ altta durum rozeti. Kaydırma ile sesli dinlemeden hangisi daha
 * ilerideyse o gösterilir; "Okundu" kararını okuma oturumu verir (lib/article-session.ts).
 */
export function ReadingProgressBar() {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionServerSnapshot);
  // Çubuk o anki konumu gösterir (yukarı kaydırınca geri gelir); kayıt en ileri noktayı tutar
  const [position, setPosition] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setPosition(measureArticleProgress() ?? 0);
      setScrolled(window.scrollY > 150);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();

    let hideNote: ReturnType<typeof setTimeout> | undefined;
    const onRead = (e: Event) => {
      if (!(e as CustomEvent<{ saved?: boolean }>).detail?.saved) return;
      setSavedNote(true);
      hideNote = setTimeout(() => setSavedNote(false), 4000);
    };
    window.addEventListener(ARTICLE_READ_EVENT, onRead);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(hideNote);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener(ARTICLE_READ_EVENT, onRead);
    };
  }, []);

  const { completed, listening, listen, listenRemaining, estimatedMinutes } = session;
  const shown = completed ? 100 : Math.max(position, listening ? listen : 0);
  const readingLeft = Math.max(1, Math.ceil(estimatedMinutes * (1 - shown / 100)));
  const listenLeft = listenRemaining !== null ? Math.max(1, Math.ceil(listenRemaining / 60)) : null;
  const visible = scrolled || savedNote || listening || completed;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-1.5 z-50 bg-border/20 backdrop-blur-xs pointer-events-none">
        <div
          className="h-full bg-linear-to-r from-primary-500 via-primary-400 to-accent-500 transition-all duration-150 ease-out"
          style={{ width: `${shown}%` }}
        />
      </div>

      <div
        className={`fixed bottom-6 right-6 z-40 transition-all duration-300 transform ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-live="polite"
      >
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md text-xs font-semibold ${
          completed ? "bg-emerald-600 border-emerald-500 text-white" : "bg-background/90 border-border/80 text-foreground"
        }`}>
          {completed ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>{savedNote ? "Okundu · Okuduklarım'a eklendi" : session.completedBy === "listen" ? "Dinlendi" : "Okundu"}</span>
            </>
          ) : listening ? (
            <>
              <Headphones className="h-4 w-4 text-primary-500" />
              <span>Dinleniyor{listenLeft ? ` · kalan ~${listenLeft} dk` : ""}</span>
            </>
          ) : (
            <>
              <span className="relative flex items-center justify-center">
                <svg className="w-5 h-5 -rotate-90 transform" aria-hidden>
                  <circle cx="10" cy="10" r="8" className="stroke-muted" strokeWidth="2.5" fill="none" />
                  <circle
                    cx="10" cy="10" r="8"
                    className="stroke-primary-500 transition-all duration-150"
                    strokeWidth="2.5"
                    strokeDasharray="50.26"
                    strokeDashoffset={50.26 - (50.26 * shown) / 100}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <Clock className="h-2.5 w-2.5 text-primary-500 absolute" />
              </span>
              <span>{shown >= 97 ? "Neredeyse bitti" : `Kalan: ~${readingLeft} dk`}</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
