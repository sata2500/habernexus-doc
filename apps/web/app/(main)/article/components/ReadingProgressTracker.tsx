"use client";

import { useEffect } from "react";
import { ARTICLE_READ_EVENT, getProgress, measureArticleProgress, saveProgress } from "@/lib/reading-progress";
import {
  endArticleSession,
  getSessionSnapshot,
  reportScroll,
  sessionProgress,
  startArticleSession,
  subscribeSession,
} from "@/lib/article-session";

const SYNC_STEP = 20;

/**
 * Okuma oturumunu başlatır ve kaydeder (lib/article-session.ts):
 * - bu cihazda "kaldığın yerden devam" kaydı (yalnızca okur gerçekten okumaya başladıysa),
 * - giriş yapmış okurda hesaba ilerleme ve "okundu" (profilde "Okuduklarım", önerilerde sinyal).
 * İlerleme hem kaydırmadan hem sesli dinlemeden gelir.
 */
export function ReadingProgressTracker({ articleId, slug, title, coverImage, category, estimatedMinutes }: {
  articleId: string; slug: string; title: string; coverImage: string | null; category: string | null; estimatedMinutes: number;
}) {
  useEffect(() => {
    startArticleSession(articleId, estimatedMinutes, !!getProgress(slug)?.done);

    let savedLocal = -1;
    let sent = 0;
    let signedOut = false;
    let completedSent = false;
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

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
          if (progress >= 100) window.dispatchEvent(new CustomEvent(ARTICLE_READ_EVENT, { detail: { saved: !!data.saved } }));
        })
        .catch(() => {});
    };

    const persist = (final = false) => {
      const s = getSessionSnapshot();
      if (s.articleId !== articleId || !s.engaged) return;
      const progress = sessionProgress(s);
      if (s.completed) {
        if (!completedSent) {
          completedSent = true;
          saveProgress({ slug, title, coverImage, category, progress: 100, done: true });
          send(100);
        }
        return;
      }
      if (Math.abs(progress - savedLocal) >= 5 || (final && progress !== savedLocal)) {
        savedLocal = progress;
        saveProgress({ slug, title, coverImage, category, progress });
      }
      if (progress >= 10 && progress >= sent + (final ? 5 : SYNC_STEP)) send(progress, final);
    };

    const measure = () => {
      const p = measureArticleProgress();
      if (p !== null) reportScroll(p);
    };
    const onScroll = () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => { scrollTimer = null; measure(); }, 300);
    };
    const onHide = () => persist(true);

    measure();
    const unsubscribe = subscribeSession(() => persist());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pagehide", onHide);
    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      persist(true);
      unsubscribe();
      endArticleSession(articleId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pagehide", onHide);
    };
  }, [articleId, slug, title, coverImage, category, estimatedMinutes]);

  return null;
}
