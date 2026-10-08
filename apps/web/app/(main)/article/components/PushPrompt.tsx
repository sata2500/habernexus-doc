"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing, Loader2, X } from "lucide-react";
import { getSessionServerSnapshot, getSessionSnapshot, subscribeSession } from "@/lib/article-session";
import { getSnapshot as getLocalReads } from "@/lib/reading-progress";
import { dismissPrompt, enablePush, promptDismissedRecently, pushSupported } from "@/lib/push-client";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};
const isEligible = () => pushSupported() && Notification.permission === "default" && !promptDismissedRecently();

/**
 * Bildirim daveti. Okuru sıkmamak için yalnızca okur bir haberi bitirdiğinde (ya da daha önce birkaç
 * haber okuduysa) ve izin henüz sorulmadıysa, haberin sonunda gösterilir. "Şimdi değil" 30 gün susturur.
 */
export function PushPrompt({ dailyLimit }: { dailyLimit: number }) {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionServerSnapshot);
  // Uygunluk tarayıcıda belirlenir (sunucuda bilinemez)
  const eligible = useSyncExternalStore(noopSubscribe, isEligible, () => false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "denied" | "error" | "closed">("idle");

  const readBefore = typeof window !== "undefined" && eligible ? getLocalReads().length >= 2 : false;
  if (!eligible || state === "closed" || !(session.completed || readBefore)) return null;

  const enable = async () => {
    setState("busy");
    const result = await enablePush();
    setState(result === "granted" ? "done" : result);
    if (result !== "granted") dismissPrompt();
  };

  return (
    <aside aria-labelledby="push-prompt-title" className="relative rounded-2xl border border-primary-500/25 bg-primary-500/5 p-4 sm:p-5 mb-10 flex flex-col sm:flex-row sm:items-center gap-3">
      <BellRing className="h-6 w-6 text-primary-500 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-0.5 text-sm">
        <h2 id="push-prompt-title" className="font-semibold text-base">
          {state === "done" ? "Bildirimler açıldı" : "Önemli gelişmeleri kaçırmayın"}
        </h2>
        <p className="text-muted-foreground">
          {state === "done"
            ? "Yalnızca önemli haberlerde bildirim alacaksınız. İstediğiniz zaman tarayıcı ayarlarından kapatabilirsiniz."
            : state === "denied"
              ? "Bildirim izni verilmedi. Fikrinizi değiştirirseniz tarayıcı ayarlarından açabilirsiniz."
              : state === "error"
                ? "Bildirimler şu an açılamadı. Daha sonra tekrar deneyebilirsiniz."
                : `Yalnızca önemli ve son dakika haberleri, günde en fazla ${dailyLimit} bildirim. Gece saatlerinde rahatsız etmeyiz.`}
        </p>
      </div>
      {state === "idle" || state === "busy" ? (
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => { dismissPrompt(); setState("closed"); }} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Şimdi değil
          </button>
          <button type="button" onClick={enable} disabled={state === "busy"} className={cn(buttonVariants({ size: "sm" }), "whitespace-nowrap")}>
            {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />} Bildirimleri aç
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setState("closed")} aria-label="Kapat" className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      )}
    </aside>
  );
}
