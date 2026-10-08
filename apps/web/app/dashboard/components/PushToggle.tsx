"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { currentPushSubscription, disablePush, enablePush, pushSupported } from "@/lib/push-client";
import { buttonVariants } from "@/components/ui/Button";

type State = "loading" | "unsupported" | "blocked" | "on" | "off";

/** Bu cihazdaki tarayıcı bildirimleri (abonelik cihaza/tarayıcıya özeldir) */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (!pushSupported()) return "unsupported" as const;
      if (Notification.permission === "denied") return "blocked" as const;
      return (await currentPushSubscription()) ? ("on" as const) : ("off" as const);
    };
    check().then((s) => { if (alive) setState(s); }).catch(() => { if (alive) setState("off"); });
    return () => { alive = false; };
  }, []);

  if (state === "loading" || state === "unsupported") return null;

  const toggle = async () => {
    setBusy(true);
    setNote("");
    if (state === "on") {
      await disablePush();
      setState("off");
    } else {
      const r = await enablePush();
      if (r === "granted") setState("on");
      else if (r === "denied") setState("blocked");
      else setNote("Bildirimler şu an açılamadı. Daha sonra tekrar deneyin.");
    }
    setBusy(false);
  };

  return (
    <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
      <div className="space-y-1">
        <h2 className="font-semibold text-foreground">Tarayıcı bildirimleri</h2>
        <p className="text-sm text-muted-foreground">
          {state === "blocked"
            ? "Bu tarayıcıda bildirimler engellenmiş. Açmak için tarayıcının site ayarlarından izin verin."
            : "Önemli ve son dakika haberlerinde bu cihaza bildirim gönderilir (günde birkaç taneyi geçmez)."}
        </p>
        {note && <p role="alert" className="text-sm text-error">{note}</p>}
      </div>
      {state !== "blocked" && (
        <button type="button" onClick={toggle} disabled={busy} className={buttonVariants({ variant: state === "on" ? "outline" : "primary", size: "sm" })}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "on" ? <BellOff className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
          {state === "on" ? "Bildirimleri kapat" : "Bildirimleri aç"}
        </button>
      )}
    </section>
  );
}
