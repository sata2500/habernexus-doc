"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/** Adres çubuğundaki ?q parametresini yöneten arama kutusu (yazmayı bırakınca arar). */
export function ListSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("q") ?? "";
  const [value, setValue] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const push = (q: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (q.trim()) sp.set("q", q.trim()); else sp.delete("q");
    sp.delete("sayfa");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const onChange = (q: string) => {
    setValue(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (q.trim() !== current) push(q); }, 400);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-10 rounded-xl border border-border bg-card pl-9 pr-9 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Aramayı temizle" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
