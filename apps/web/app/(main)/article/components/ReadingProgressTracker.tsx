"use client";

import { useEffect } from "react";
import { ARTICLE_READ_EVENT, measureArticleProgress, READ_COMPLETE_AT, saveProgress } from "@/lib/reading-progress";

const SYNC_STEP = 20;

/**
 * Haberin ne kadarının okunduğunu bu cihazda saklar ("kaldığın yerden devam et" için);
 * giriş yapmış okurlarda hesaba da kaydeder (profilde "Okuduklarım", önerilerde sinyal).
 */
export function ReadingProgressTracker({ articleId, slug, title, coverImage, category }: { articleId: string; slug: string; title: string; coverImage: string | null; category: string | null }) {
  useEffect(() => {
    let last = -1;
    let sent = 0;
    let signedOut = false;
    let completed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const send = (progress: number, beacon = false) => {
      if (signedOut) return;
      sent = progress;
      const body = JSON.stringify({ articleId, progress: Math.round(progress) });
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/reading", new Blob([body], { type: "application/json" }));
        return;
      }
      fetch("/api/reading", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
        .then((r) => r.json())
        .then((data: { saved?: boolean }) => {
          if (!data.saved) signedOut = true;
          if (progress >= READ_COMPLETE_AT) window.dispatchEvent(new CustomEvent(ARTICLE_READ_EVENT, { detail: { saved: !!data.saved } }));
        })
        .catch(() => {});
    };

    const flush = (final = false) => {
      const progress = measureArticleProgress();
      if (progress === null) return;
      // Okunmaya başlanmamış haberi kaydetme
      if (last < 0 && progress < 5) return;
      if (Math.abs(progress - last) >= 5) {
        last = progress;
        saveProgress({ slug, title, coverImage, category, progress });
      }
      if (progress >= READ_COMPLETE_AT && !completed) {
        completed = true;
        send(100);
      } else if (progress >= 10 && progress >= sent + (final ? 5 : SYNC_STEP) && !completed) {
        send(progress, final);
      }
    };

    const onScroll = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; flush(); }, 600);
    };
    const onHide = () => flush(true);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    return () => {
      if (timer) clearTimeout(timer);
      flush(true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
    };
  }, [articleId, slug, title, coverImage, category]);

  return null;
}
