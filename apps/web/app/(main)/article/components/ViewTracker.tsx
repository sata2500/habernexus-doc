"use client";

import { useEffect } from "react";
import { recordArticleView } from "../view-actions";
import { hasPersonalizationConsent, READ_HISTORY_COOKIE, READ_HISTORY_MAX } from "@/lib/consent";
import { getSessionSnapshot, subscribeSession } from "@/lib/article-session";
import { VIEW_COUNT_EVENT } from "./ViewCount";

interface Props {
  articleId: string;
}

/** Sayfa en az bu kadar süre ekranda (sekme açık ve görünür) kalınca görüntülenme sayılır */
const VISIBLE_MS = 5000;

/** "Sizin İçin" önerileri için son okunan haberler; yalnızca çerez onayı verilmişse */
function rememberRead(articleId: string) {
  if (!hasPersonalizationConsent()) return;
  try {
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${READ_HISTORY_COOKIE}=`))
      ?.slice(READ_HISTORY_COOKIE.length + 1);
    const ids = decodeURIComponent(current ?? "").split(",").filter(Boolean);
    const next = [articleId, ...ids.filter((id) => id !== articleId)].slice(0, READ_HISTORY_MAX);
    document.cookie = `${READ_HISTORY_COOKIE}=${encodeURIComponent(next.join(","))}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
  } catch {
    // Çerez yazılamazsa öneriler sadece kaydedilenlere göre çalışır
  }
}

/**
 * Görüntülenme: sayfa arka planda açılıp bırakılınca ya da önceden yüklenince (prerender) sayılmaz;
 * sekme görünürken toplam 5 saniye geçince ya da haber dinlenmeye başlanınca (ekran kapalı dinlense
 * bile) bir kez bildirilir. Aynı kişinin aynı gün içindeki
 * tekrar ziyaretleri sunucuda ayıklanır (lib/server/views.ts).
 */
export function ViewTracker({ articleId }: Props) {
  useEffect(() => {
    let visibleMs = 0;
    let since = document.visibilityState === "visible" ? performance.now() : null;
    let done = false;

    const record = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      unsubscribe();
      rememberRead(articleId);
      void recordArticleView(articleId)
        .then((r) => {
          if (typeof r.viewCount === "number") window.dispatchEvent(new CustomEvent(VIEW_COUNT_EVENT, { detail: { articleId, viewCount: r.viewCount } }));
        })
        .catch(() => {});
    };
    const tick = () => {
      if (done) return;
      const now = performance.now();
      if (since !== null) { visibleMs += now - since; since = now; }
      if (visibleMs >= VISIBLE_MS) record();
    };
    // Dinlemeye başlamak açık bir ilgi göstergesi: beklemeden sayılır
    const onSession = () => {
      const s = getSessionSnapshot();
      if (s.listening && s.articleId === articleId) record();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") since = performance.now();
      else { tick(); since = null; }
    };

    const unsubscribe = subscribeSession(onSession);
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [articleId]);

  return null;
}
