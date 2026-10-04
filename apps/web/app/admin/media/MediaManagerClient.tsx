"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, CheckSquare, Clock, ExternalLink, ImageIcon, Loader2, Square, Trash2, X, Zap } from "lucide-react";
import { deleteMediaItems } from "@/app/actions/admin-media";
import { cn, formatBytes, formatRelativeTime } from "@/lib/utils";
import type { AdminMediaRow } from "@/lib/server/admin-lists";

const STATUS = {
  OPTIMIZED: { label: "Optimize", icon: CheckCircle2, cls: "bg-success text-white" },
  RAW: { label: "Ham", icon: Clock, cls: "bg-warning text-white" },
  PROCESSING: { label: "İşleniyor", icon: Loader2, cls: "bg-primary-500 text-white" },
  FAILED: { label: "Hatalı", icon: AlertCircle, cls: "bg-error text-white" },
} as const;

export function MediaManagerClient({ items }: { items: AdminMediaRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<Set<string>>(new Set());

  // Sayfa veya filtre değişince seçim sıfırlansın
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setSelected(new Set());
  }

  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const optimize = async (ids: string[]) => {
    setWorking((w) => new Set([...w, ...ids]));
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/media/${id}/optimize`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) failed++;
      } catch {
        failed++;
      }
      setWorking((w) => { const next = new Set(w); next.delete(id); return next; });
    }
    if (failed) alert(`${failed} görsel optimize edilemedi.`);
    setSelected(new Set());
    router.refresh();
  };

  const remove = (ids: string[]) => {
    const used = items.filter((m) => ids.includes(m.id) && m.usedIn.length > 0);
    const warning = used.length
      ? `\n\nDikkat: ${used.length} görsel kullanımda (${[...new Set(used.flatMap((m) => m.usedIn))].join(", ")}). Silinirse bu yerlerden kaldırılır; görseli kullanan slaytlar da silinir.`
      : "";
    if (!confirm(`${ids.length} görsel kalıcı olarak silinsin mi?${warning}`)) return;
    startTransition(async () => {
      const res = await deleteMediaItems(ids);
      if (!res.success) alert(res.error);
      setSelected(new Set());
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
        Bu filtrelere uygun görsel yok.
      </div>
    );
  }

  const ids = [...selected];
  const rawSelected = items.filter((m) => selected.has(m.id) && (m.status === "RAW" || m.status === "FAILED")).map((m) => m.id);
  const allSelected = selected.size === items.length;
  const busy = isPending || working.size > 0;

  return (
    <div className="space-y-3">
      <div className={cn("flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5", selected.size > 0 && "bg-primary-500/10")}>
        <button onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((m) => m.id)))} className="inline-flex items-center gap-2 h-8 px-2 rounded-lg text-xs font-semibold hover:bg-muted">
          {allSelected ? <CheckSquare className="h-4 w-4 text-primary-500" /> : <Square className="h-4 w-4 text-muted-foreground" />}
          {selected.size > 0 ? `${selected.size} seçili` : "Sayfadakileri seç"}
        </button>
        {selected.size > 0 && (
          <>
            {rawSelected.length > 0 && (
              <button disabled={busy} onClick={() => optimize(rawSelected)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-card border border-border text-xs font-semibold disabled:opacity-50">
                <Zap className="h-3.5 w-3.5 text-primary-500" /> Optimize et ({rawSelected.length})
              </button>
            )}
            <button disabled={busy} onClick={() => remove(ids)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-error text-white text-xs font-semibold disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>
            <button onClick={() => setSelected(new Set())} aria-label="Seçimi temizle" className="ml-auto h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((m) => {
          const isSelected = selected.has(m.id);
          const isWorking = working.has(m.id);
          const st = STATUS[isWorking ? "PROCESSING" : m.status];
          return (
            <li key={m.id} className={cn("rounded-2xl border bg-card overflow-hidden shadow-card min-w-0 flex flex-col", isSelected ? "border-primary-500 ring-2 ring-primary-500/20" : "border-border")}>
              <button type="button" onClick={() => toggle(m.id)} aria-pressed={isSelected} aria-label={`${m.filename} seç`} className="relative block aspect-video bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                <span className={cn("absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", st.cls)}>
                  <st.icon className={cn("h-3 w-3", isWorking && "animate-spin")} /> {st.label}
                </span>
                <span className={cn("absolute top-2 right-2 h-6 w-6 rounded-md border-2 flex items-center justify-center", isSelected ? "bg-primary-500 border-primary-500 text-white" : "bg-black/30 border-white/70")}>
                  {isSelected && <CheckCircle2 className="h-4 w-4" />}
                </span>
              </button>
              <div className="p-2.5 space-y-1 flex-1 flex flex-col">
                <p className="text-xs font-semibold truncate" title={m.filename}>{m.filename.split("/").pop()}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {formatBytes(m.size)}{m.width ? ` · ${m.width}×${m.height}` : ""} · {formatRelativeTime(m.createdAt, { compact: true })}
                </p>
                <p className={cn("text-[10px] font-semibold truncate", m.usedIn.length ? "text-primary-500" : "text-muted-foreground")}>
                  {m.usedIn.length ? m.usedIn.join(", ") : "Kullanılmıyor"}
                </p>
                <div className="mt-auto flex items-center gap-1 pt-1">
                  {(m.status === "RAW" || m.status === "FAILED") && (
                    <button disabled={busy} onClick={() => optimize([m.id])} className="inline-flex items-center gap-1 h-8 px-2 rounded-lg bg-primary-500/10 text-primary-500 text-[11px] font-semibold disabled:opacity-50">
                      <Zap className="h-3.5 w-3.5" /> Optimize
                    </button>
                  )}
                  <a href={m.url} target="_blank" rel="noreferrer" aria-label="Görseli aç" className="ml-auto h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button disabled={busy} onClick={() => remove([m.id])} aria-label="Sil" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-error/10 hover:text-error disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
