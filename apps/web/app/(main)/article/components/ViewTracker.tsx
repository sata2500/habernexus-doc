"use client";

import { useEffect, useRef } from "react";
import { incrementViewCount } from "@/app/author/actions";
import { hasPersonalizationConsent, READ_HISTORY_COOKIE, READ_HISTORY_MAX } from "@/lib/consent";

interface Props {
  articleId: string;
}

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

export function ViewTracker({ articleId }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    rememberRead(articleId);

    // Haberi görüntülemeyi bir kez artır
    const track = async () => {
      try {
        await incrementViewCount(articleId);
        tracked.current = true;
      } catch {
        // Sessiz hata - uygulama akışını bozma
      }
    };

    // Sayfa tamamen yüklendikten sonra (reaksiyon süresini etkilememesi için)
    const timeout = setTimeout(track, 2000);

    return () => clearTimeout(timeout);
  }, [articleId]);

  return null; // Görsel bir bileşen değil
}
