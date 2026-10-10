"use client";

import { useEffect, useState } from "react";
import { formatViewCount } from "@/lib/utils";

/** ViewTracker görüntülenmeyi kaydedince güncel sayıyı bu olayla yayınlar */
export const VIEW_COUNT_EVENT = "hn:view-count";

/**
 * Haber sayfası önbellekten (ISR) gelir; sayfadaki görüntülenme sayısı en fazla bir saat eski olabilir.
 * Görüntülenme kaydedilince sunucunun döndürdüğü güncel sayı gösterilir.
 */
export function ViewCount({ articleId, initial }: { articleId: string; initial: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const onCount = (e: Event) => {
      const d = (e as CustomEvent<{ articleId: string; viewCount: number }>).detail;
      if (d?.articleId === articleId) setCount(d.viewCount);
    };
    window.addEventListener(VIEW_COUNT_EVENT, onCount);
    return () => window.removeEventListener(VIEW_COUNT_EVENT, onCount);
  }, [articleId]);
  return <>{formatViewCount(count)}</>;
}
