"use client";

import { useEffect, useRef } from "react";
import { incrementViewCount } from "@/app/author/actions";

interface Props {
  articleId: string;
}

export function ViewTracker({ articleId }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    
    // Haberi görüntülemeyi bir kez artır
    const track = async () => {
      try {
        await incrementViewCount(articleId);
        tracked.current = true;
      } catch (err) {
        // Hata durumunda ses çıkarma
      }
    };

    // Sayfa tamamen yüklendikten sonra (reaksiyon süresini etkilememesi için)
    const timeout = setTimeout(track, 2000); 

    return () => clearTimeout(timeout);
  }, [articleId]);

  return null; // Görsel bir bileşen değil
}
