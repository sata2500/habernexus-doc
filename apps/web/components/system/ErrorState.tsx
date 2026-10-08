"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

/**
 * Bölüm hata ekranı (error.tsx'lerden kullanılır). Sunucu hatalarının ayrıntısı üretimde
 * gizlidir; kullanıcıya yalnızca destek için hata kodu (digest) gösterilir.
 */
export function ErrorState({
  error,
  retry,
  homeHref = "/",
  homeLabel = "Ana sayfaya dön",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
    // Hata ekranı React hata sınırında yakalanır; Sentry'ye ayrıca bildirilir (DSN yoksa işlem yapmaz)
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-16" role="alert">
      <div className="max-w-md text-center space-y-4">
        <span className="mx-auto h-14 w-14 rounded-full bg-error/10 text-error flex items-center justify-center">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold font-display">Bir şeyler ters gitti</h1>
        <p className="text-sm text-muted-foreground">
          Sayfa yüklenirken beklenmedik bir hata oluştu. Tekrar denemek çoğu zaman sorunu çözer.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-11 items-center justify-center gap-2 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Tekrar dene
          </button>
          <Link href={homeHref} className="inline-flex h-11 items-center justify-center gap-2 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
            <Home className="h-4 w-4" aria-hidden /> {homeLabel}
          </Link>
        </div>
        {error.digest && <p className="text-[11px] text-muted-foreground">Hata kodu: <code>{error.digest}</code></p>}
      </div>
    </div>
  );
}
