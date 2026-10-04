import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { listHref, PAGE_SIZE, type RawParams } from "@/lib/admin/list";

/** Filtre çipleri: her biri aynı parametrenin bir değerine bağlantıdır. */
export function FilterChips({ base, params, name, options }: {
  base: string; params: RawParams; name: string;
  options: { value: string; label: string; count?: number }[];
}) {
  const raw = params[name];
  const current = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
      {options.map((o) => {
        const active = current === o.value;
        return (
          <Link
            key={o.value || "all"}
            href={listHref(base, params, { [name]: o.value || null })}
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-semibold transition-colors",
              active ? "bg-foreground text-background border-foreground" : "border-border bg-card hover:bg-muted"
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn("tabular-nums", active ? "opacity-70" : "text-muted-foreground")}>{o.count.toLocaleString("tr-TR")}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function Pagination({ base, params, page, total }: { base: string; params: RawParams; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const btn = "inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-border bg-card text-sm font-semibold";
  return (
    <nav aria-label="Sayfalama" className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground tabular-nums">{from}–{to} / {total.toLocaleString("tr-TR")}</p>
      <div className="flex items-center gap-2">
        {page > 1
          ? <Link href={listHref(base, params, { sayfa: page - 1 })} className={cn(btn, "hover:bg-muted")}><ChevronLeft className="h-4 w-4" /> Önceki</Link>
          : <span className={cn(btn, "opacity-40")} aria-disabled="true"><ChevronLeft className="h-4 w-4" /> Önceki</span>}
        <span className="text-xs text-muted-foreground tabular-nums">{page}/{pages}</span>
        {page < pages
          ? <Link href={listHref(base, params, { sayfa: page + 1 })} className={cn(btn, "hover:bg-muted")}>Sonraki <ChevronRight className="h-4 w-4" /></Link>
          : <span className={cn(btn, "opacity-40")} aria-disabled="true">Sonraki <ChevronRight className="h-4 w-4" /></span>}
      </div>
    </nav>
  );
}
