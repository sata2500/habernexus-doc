import { getRssSources, getRssSuggestions, getRssStats, getGoogleTrendOpportunities } from "./actions";
import { getSystemSettings } from "./cron-actions";
import { prisma } from "@/lib/prisma";
import { FeedSourceManager } from "./components/FeedSourceManager";
import { SuggestionsList } from "./components/SuggestionsList";
import { SuggestionsFilter } from "./components/SuggestionsFilter";
import { AdminTriggerButtons } from "./components/AdminTriggerButtons";
import { CronSettingsCard } from "./components/CronSettingsCard";
import { GoogleTrendsBar } from "./components/GoogleTrendsBar";
import { Rss, Sparkles, Database, CheckCircle2, X, BarChart3 } from "lucide-react";

export default async function AdminRssFeedsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; category?: string }>;
}) {
  const params = await searchParams;
  
  const [sources, suggestions, stats, systemSettings, categories, trends] = await Promise.all([
    getRssSources(),
    getRssSuggestions({
      status: params.status,
      search: params.search,
      category: params.category,
    }),
    getRssStats(),
    getSystemSettings(),
    prisma.category.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    getGoogleTrendOpportunities(),
  ]);

  const categoryNames = categories.map((c) => c.name);

  const statCards = [
    { label: "Toplam Öğe", value: stats.total, icon: Database, color: "text-primary-500 bg-primary-500/10 border border-primary-500/5" },
    { label: "Bekleyen Analiz", value: stats.pending, icon: Rss, color: "text-warning bg-warning/10 border border-warning/5" },
    { label: "Yeni Öneriler", value: stats.analyzed, icon: Sparkles, color: "text-accent-500 bg-accent-500/10 border border-accent-500/5" },
    { label: "Onaylananlar", value: stats.approved, icon: CheckCircle2, color: "text-success bg-success/10 border border-success/5" },
    { label: "Haberleştirildi", value: stats.used, icon: BarChart3, color: "text-primary-600 bg-primary-600/10 border border-primary-600/5" },
    { label: "Reddedildi", value: stats.dismissed, icon: X, color: "text-error bg-error/10 border border-error/5" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Rss className="h-6 w-6 text-primary-500" />
            RSS Öneri Sistemi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kaynak yönetimi, AI analizi ve yazarlar için haber onayı.
          </p>
        </div>
        <AdminTriggerButtons />
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="glass-strong hover-lift rounded-2xl p-2.5 sm:p-4 border border-border shadow-soft flex flex-col items-center gap-1.5 sm:gap-2 text-center hover:shadow-glow hover:border-primary-500/20 transition-all duration-300 min-w-0 w-full overflow-hidden"
          >
            <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <p className="text-xl sm:text-2xl font-black font-display text-foreground tracking-tight leading-none mt-0.5 sm:mt-1">{stat.value}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold leading-tight uppercase tracking-wider break-words line-clamp-2 max-w-full">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Otomasyon & Cron ── */}
      <section>
        <CronSettingsCard 
          scanCron={systemSettings.rssScanCron} 
          analyzeCron={systemSettings.rssAnalyzeCron} 
          hasNewsletter={!!systemSettings.qStashNewsletterId}
          retentionDays={systemSettings.rssRetentionDays}
        />
      </section>

      {/* ── Google Trends Fırsatları ── */}
      <section>
        <GoogleTrendsBar trends={trends} />
      </section>

      {/* ── RSS Kaynakları ── */}
      <section>
        <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
          <Rss className="h-5 w-5 text-muted-foreground" />
          RSS Kaynakları
        </h2>
        <FeedSourceManager sources={sources} />
      </section>

      {/* ── Öneri Listesi ── */}
      <section>
        <div className="space-y-6">
          <SuggestionsFilter categories={categoryNames} />
          
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-bold font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-500" />
              Haber Önerileri
            </h2>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {suggestions.length} sonuç
            </span>
          </div>
          
          <SuggestionsList 
            key={`${params.status}-${params.search}-${params.category}`} 
            suggestions={suggestions} 
          />
        </div>
      </section>
    </div>
  );
}
