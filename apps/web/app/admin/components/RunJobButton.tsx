"use client";

import { confirmDialog } from "@/components/ui/feedback";

import { useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import { runJobNowAction } from "../settings/automation-actions";
import type { AutomationJob } from "@/lib/server/automation";
import { cn } from "@/lib/utils";

/** Bir otomasyon işini beklemeden çalıştırır ve sonucu altında gösterir. */
export function RunJobButton({ job, label = "Şimdi çalıştır", confirmText }: { job: AutomationJob; label?: string; confirmText?: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    if (confirmText && !(await confirmDialog({ title: label, message: confirmText, confirmText: "Çalıştır" }))) return;
    setResult(null);
    start(async () => {
      const res = await runJobNowAction(job);
      setResult(res.success ? { ok: true, text: res.message } : { ok: false, text: res.error });
    });
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {pending ? "Çalışıyor…" : label}
      </button>
      {result && (
        <p role="status" className={cn("text-xs", result.ok ? "text-success" : "text-error")}>{result.text}</p>
      )}
    </div>
  );
}
