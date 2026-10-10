"use client";

import { confirmDialog } from "@/components/ui/feedback";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PenLine, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { runPipelineNow, writeNextNow } from "../actions";

/** Elle çalıştırma: tara + değerlendir, sıradakini yaz. */
export function PipelineBar({ queueCount }: { queueCount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [running, setRunning] = useState<"scan" | "write" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (kind: "scan" | "write") => {
    if (kind === "write" && !(await confirmDialog({ title: "Sıradaki konu şimdi yazılsın mı?", message: "En yüksek puanlı konu yazılıp hemen yayınlanır.", confirmText: "Yaz ve yayınla" }))) return;
    setMsg(null);
    setRunning(kind);
    start(async () => {
      const r = kind === "scan" ? await runPipelineNow() : await writeNextNow(1);
      setMsg(r.success ? { ok: true, text: r.message } : { ok: false, text: r.error });
      setRunning(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => run("scan")} disabled={pending} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted disabled:opacity-60">
          {running === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {running === "scan" ? "Taranıyor ve değerlendiriliyor…" : "Tara ve değerlendir"}
        </button>
        <button onClick={() => run("write")} disabled={pending || queueCount === 0} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-50">
          {running === "write" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          {running === "write" ? "Yazılıyor…" : "Sıradakini yaz"}
        </button>
      </div>
      {msg && (
        <p role="status" className={cn("flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm", msg.ok ? "border-success/30 bg-success/10" : "border-error/30 bg-error/5")}>
          {msg.ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-error shrink-0 mt-0.5" />}
          <span className="min-w-0 break-words">{msg.text}</span>
        </p>
      )}
    </div>
  );
}
