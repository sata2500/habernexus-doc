"use client";

import { useState, useEffect } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

interface Props {
  categories: string[];
}

export function SuggestionsFilter({ categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "ANALYZED");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) params.set("search", debouncedSearch);
    else params.delete("search");
    
    if (status) params.set("status", status);
    else params.delete("status");
    
    if (category !== "all") params.set("category", category);
    else params.delete("category");

    router.push(`?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, status, category, router, searchParams]);

  const clearFilters = () => {
    setSearch("");
    setStatus("ANALYZED");
    setCategory("all");
    router.push("?");
  };

  const statuses = [
    { label: "Aktif Öneriler", value: "ANALYZED" },
    { label: "Onaylananlar", value: "APPROVED" },
    { label: "Reddedilenler", value: "DISMISSED" },
    { label: "Düşük Puanlılar", value: "LOW_SCORE" },
  ];

  return (
    <div className="flex flex-col gap-4 bg-background/50 border border-border p-4 rounded-2xl shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Haber başlıklarında ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                status === s.value
                  ? "bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/20"
                  : "bg-background border-border text-muted-foreground hover:border-primary-500/30 hover:text-primary-600"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-4">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Kategori:</span>
        </div>
        
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-background border border-border rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:border-primary-500"
        >
          <option value="all">Tümü</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {(search || status !== "ANALYZED" || category !== "all") && (
          <button
            onClick={clearFilters}
            className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider ml-auto"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>
    </div>
  );
}
