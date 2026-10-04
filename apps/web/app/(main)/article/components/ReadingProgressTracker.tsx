"use client";

import { useEffect } from "react";
import { saveProgress } from "@/lib/reading-progress";

/** Haberin ne kadarının okunduğunu bu cihazda saklar ("kaldığın yerden devam et" için). */
export function ReadingProgressTracker({ slug, title, coverImage, category }: { slug: string; title: string; coverImage: string | null; category: string | null }) {
  useEffect(() => {
    const body = document.getElementById("article-body");
    if (!body) return;
    let last = -1;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Metnin ekrana gelmiş (görülmüş) kısmının oranı
    const measure = () => {
      const rect = body.getBoundingClientRect();
      if (rect.height <= 0) return 100;
      return Math.min(100, Math.max(0, ((window.innerHeight - rect.top) / rect.height) * 100));
    };

    const flush = () => {
      const progress = measure();
      // Küçük değişimleri yazma; okunmaya başlanmamış haberi kaydetme
      if (Math.abs(progress - last) < 5 || (last < 0 && progress < 5)) return;
      last = progress;
      saveProgress({ slug, title, coverImage, category, progress });
    };

    const onScroll = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; flush(); }, 800);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);
    return () => {
      if (timer) clearTimeout(timer);
      flush();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
    };
  }, [slug, title, coverImage, category]);

  return null;
}
