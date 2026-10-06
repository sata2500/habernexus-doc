"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { FeedArticleCard } from "./FeedArticleCard";
import type { FeedArticle, FeedPage } from "@/lib/feed-types";

interface ArticleFeedProps {
  initialItems: FeedArticle[];
  initialCursor: string | null;
  /**
   * "button": "Daha fazla yükle" düğmesiyle yükler, `maxLoads` sonra tüm haberler sayfasına yönlendirir.
   * "infinite": kullanıcı kaydırdıkça otomatik yükler (sonsuz kaydırma).
   */
  mode?: "button" | "infinite";
  maxLoads?: number;
  pageSize?: number;
  category?: string;
  /** Görseli öncelikli yüklenecek ilk kart sayısı (akış sayfanın üstündeyse 3, aşağıdaysa 0) */
  eagerCount?: number;
}

export function ArticleFeed({
  initialItems,
  initialCursor,
  mode = "button",
  maxLoads = 3,
  pageSize = 12,
  category,
  eagerCount = 3,
}: ArticleFeedProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loads, setLoads] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const hasMore = cursor !== null;
  const reachedButtonLimit = mode === "button" && loads >= maxLoads;

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setStatus("loading");

    try {
      const params = new URLSearchParams({ cursor, limit: String(pageSize) });
      if (category) params.set("category", category);
      const res = await fetch(`/api/feed?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as FeedPage;

      setItems((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...page.items.filter((a) => !seen.has(a.id))];
      });
      setCursor(page.nextCursor);
      setLoads((n) => n + 1);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  }, [cursor, pageSize, category]);

  // Sonsuz kaydırma: sayfa sonuna yaklaşınca otomatik yükle
  useEffect(() => {
    if (mode !== "infinite" || !hasMore || status === "error") return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mode, hasMore, status, loadMore]);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
        Henüz yayınlanmış haber bulunmuyor.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {items.map((article, i) => (
          <FeedArticleCard key={article.id} article={article} priority={i < eagerCount} />
        ))}
      </div>

      <div ref={sentinelRef} aria-hidden="true" />

      <div className="mt-8 flex flex-col items-center gap-3" aria-live="polite">
        {status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Haberler yükleniyor…
          </div>
        )}

        {status === "error" && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-error/30 text-error text-sm font-semibold hover:bg-error/10 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Yüklenemedi, tekrar dene
          </button>
        )}

        {mode === "button" && status === "idle" && hasMore && !reachedButtonLimit && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="inline-flex items-center justify-center gap-2 h-12 w-full sm:w-auto px-8 rounded-xl bg-card border border-border text-foreground text-sm font-semibold shadow-card hover:bg-muted hover:border-primary-500/40 transition-all cursor-pointer active:scale-[0.98]"
          >
            Daha fazla haber yükle
          </button>
        )}

        {mode === "button" && (reachedButtonLimit || (!hasMore && loads > 0)) && (
          <Link
            href="/latest"
            className="inline-flex items-center justify-center gap-2 h-12 w-full sm:w-auto px-8 rounded-xl bg-gradient-primary text-white text-sm font-semibold shadow-soft hover:opacity-95 transition-all active:scale-[0.98]"
          >
            Tüm haber akışına git <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        {mode === "infinite" && !hasMore && (
          <p className="text-sm text-muted-foreground py-4">Tüm haberleri gördünüz. 🎉</p>
        )}
      </div>
    </div>
  );
}
