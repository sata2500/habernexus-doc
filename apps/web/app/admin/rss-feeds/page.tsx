import Link from "next/link";
import { Rss, Timer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getRssSources, getRssSuggestions, getRssStats } from "./actions";
import { FeedSourceManager } from "./components/FeedSourceManager";
import { SuggestionsList } from "./components/SuggestionsList";
import { SuggestionsFilter } from "./components/SuggestionsFilter";
import { AdminTriggerButtons } from "./components/AdminTriggerButtons";

type Params = Promise<{ status?: string; search?: string; category?: string; view?: string }>;

export default async function AdminRssFeedsPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const view = params.view === "kaynaklar" ? "kaynaklar" : "oneriler";

  const [stats, sources, suggestions, categories] = await Promise.all([
    getRssStats(),
    view === "kaynaklar" ? getRssSources() : Promise.resolve([]),
    view === "oneriler" ? getRssSuggestions({ status: params.status, search: params.search, category: params.category }) : Promise.resolve([]),
    view === "oneriler" ? prisma.category.findMany({ select: { name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const statChips = [
    { label: "Analiz bekliyor", value: stats.pending, tone: "text-warning" },
    { label: "Yeni öneri", value: stats.analyzed, tone: "text-primary-500" },
    { label: "Onaylı", value: stats.approved, tone: "text-success" },
    { label: "Haberleştirildi", value: stats.used, tone: "text-foreground" },
    { label: "Reddedildi", value: stats.dismissed, tone: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2">
            <Rss className="h-6 w-6 text-primary-500" /> RSS Önerileri
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kaynaklardan gelen haberler yapay zekâ ile puanlanır; en iyileri yazılmak üzere burada listelenir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminTriggerButtons />
          <Link href="/admin/settings?tab=otomasyon" className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground">
            <Timer className="h-4 w-4" /> Otomasyon
          </Link>
        </div>
      </div>

      {/* Durum özeti */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
        <ul className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
          {statChips.map((s) => (
            <li key={s.label} className="flex items-baseline gap-1.5 rounded-xl border border-border bg-card px-3 py-2 whitespace-nowrap">
              <span className={cn("text-lg font-bold tabular-nums", s.tone)}>{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Görünüm seçimi */}
      <nav aria-label="RSS bölümleri" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted border border-border max-w-sm">
        {[
          { id: "oneriler", label: `Öneriler`, href: "/admin/rss-feeds" },
          { id: "kaynaklar", label: `Kaynaklar`, href: "/admin/rss-feeds?view=kaynaklar" },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={view === t.id ? "page" : undefined}
            className={cn(
              "h-9 rounded-xl flex items-center justify-center text-sm font-semibold transition-all",
              view === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {view === "kaynaklar" ? (
        <FeedSourceManager sources={sources} />
      ) : (
        <section className="space-y-4">
          <SuggestionsFilter categories={categories.map((c) => c.name)} />
          <p className="text-sm text-muted-foreground">{suggestions.length} sonuç</p>
          <SuggestionsList key={`${params.status}-${params.search}-${params.category}`} suggestions={suggestions} />
        </section>
      )}
    </div>
  );
}
