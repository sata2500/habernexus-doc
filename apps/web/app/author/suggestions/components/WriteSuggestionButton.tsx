"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { markSuggestionAsUsed } from "../actions";

/** Konuyu üstlenip editörü açar; başkası üstlendiyse uyarır */
export function WriteSuggestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="shrink-0 flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await markSuggestionAsUsed(id);
          if (r.success) router.push(`/author/articles/new?oneri=${id}`);
          else { setError(r.error); router.refresh(); }
        })}
        className="h-8 px-3 inline-flex items-center gap-1 rounded-lg bg-primary-500/10 text-primary-500 text-xs font-semibold hover:bg-primary-500/20 disabled:opacity-60 cursor-pointer"
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />} Yaz
      </button>
      {error && <span role="alert" className="text-[10px] text-error max-w-40 text-right">{error}</span>}
    </span>
  );
}
