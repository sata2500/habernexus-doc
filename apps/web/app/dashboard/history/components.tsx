"use client";

import { confirmDialog } from "@/components/ui/feedback";

import { useTransition } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { clearReadingHistory, removeReadingHistoryItem } from "../actions";

export function RemoveReadButton({ articleId, title }: { articleId: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(async () => { await removeReadingHistoryItem(articleId); })}
      disabled={pending}
      aria-label={`${title} geçmişten kaldır`}
      title="Geçmişten kaldır"
      className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
    </button>
  );
}

export function ClearHistoryButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!(await confirmDialog({ title: "Okuma geçmişi silinsin mi?", message: "Tüm okuma geçmişiniz silinir; \"Sizin İçin\" önerileri de sıfırlanır.", confirmText: "Geçmişi temizle", tone: "danger" }))) return;
        start(async () => { await clearReadingHistory(); });
      }}
      disabled={pending}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-error hover:border-error/40 disabled:opacity-50 cursor-pointer"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Geçmişi temizle
    </button>
  );
}
