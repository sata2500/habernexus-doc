import { getRssSources, getRssSuggestions, getRssStats } from "./actions";
import { getSystemSettings } from "./cron-actions";
import { FeedSourceManager } from "./components/FeedSourceManager";
import { SuggestionsList } from "./components/SuggestionsList";
import { AdminTriggerButtons } from "./components/AdminTriggerButtons";
import { CronSettingsCard } from "./components/CronSettingsCard";
import { Rss, Sparkles, Database, CheckCircle2, X, BarChart3 } from "lucide-react";

export default async function AdminRssFeedsPage() {
  const [sources, suggestions, stats, systemSettings] = await Promise.all([
    getRssSources(),
    getRssSuggestions(),
    getRssStats(),
    getSystemSettings(),
  ]);

  const statCards = [
    { label: "Toplam Öğe", value: stats.total, icon: Database, color: "text-blue-500 bg-blue-500/10" },
    { label: "Bekleyen Analiz", value: stats.pending, icon: Rss, color: "text-amber-500 bg-amber-500/10" },
    { label: "Aktif Öneri", value: stats.analyzed, icon: Sparkles, color: "text-primary-500 bg-primary-500/10" },
    { label: "Kapsandı", value: stats.covered, icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
    { label: "Haberleştirildi", value: stats.used, icon: BarChart3, color: "text-purple-500 bg-purple-500/10" },
    { label: "Reddedildi", value: stats.dismissed, icon: X, color: "text-red-500 bg-red-500/10" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit) flex items-center gap-2">
            <Rss className="h-6 w-6 text-primary-500" />
            RSS Öneri Sistemi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kaynak yönetimi, AI analizi ve yazarlara önerilecek haber konuları.
          </p>
        </div>
        <AdminTriggerButtons />
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="glass-strong rounded-2xl p-4 border border-border shadow-soft flex flex-col items-center gap-2 text-center"
          >
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold font-(family-name:--font-outfit)">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Otomasyon & Cron ── */}
      <section>
        <CronSettingsCard 
          scanCron={systemSettings.rssScanCron} 
          analyzeCron={systemSettings.rssAnalyzeCron} 
        />
      </section>

      {/* ── RSS Kaynakları ── */}
      <section>
        <h2 className="text-lg font-bold font-(family-name:--font-outfit) mb-4 flex items-center gap-2">
          <Rss className="h-5 w-5 text-muted-foreground" />
          RSS Kaynakları
        </h2>
        <FeedSourceManager sources={sources} />
      </section>

      {/* ── Öneri Listesi ── */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-bold font-(family-name:--font-outfit) flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            Aktif Haber Önerileri
          </h2>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {suggestions.length} öneri
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Yazarlara gösterilecek, AI tarafından puanlanmış haber konuları.
        </p>
        <SuggestionsList suggestions={suggestions} />
      </section>
    </div>
  );
}
