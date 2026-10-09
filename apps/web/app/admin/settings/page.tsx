import Link from "next/link";
import { BellRing, Megaphone, Settings2, Sparkles, ServerCog, SlidersHorizontal, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminSiteSettings } from "./actions";
import { getAiOverview } from "./ai-actions";
import { SiteSettingsForm } from "./components/SiteSettingsForm";
import { AiSettingsPanel } from "./components/AiSettingsPanel";
import { SystemPanel } from "./components/SystemPanel";
import { getIndexingLog, isIndexingConfigured } from "@/lib/google-indexing";
import { AutomationPanel } from "./components/AutomationPanel";
import { getAutomationOverview } from "./automation-actions";
import { getMigrationStatus, type MigrationStatus } from "@/lib/server/db-migrations";
import { getMonetizationOverview } from "./monetization-actions";
import { MonetizationPanel } from "./components/MonetizationPanel";
import { SponsorManager } from "./components/SponsorManager";
import { getNotificationOverview } from "./notification-actions";
import { NotificationPanel } from "./components/NotificationPanel";

export const dynamic = "force-dynamic";
// Veritabanı güncellemeleri ve model testleri için yeterli süre
export const maxDuration = 300;

const SERVICES = [
  { key: "DATABASE_URL", label: "Veritabanı (PostgreSQL)" },
  { key: "BETTER_AUTH_SECRET", label: "Oturum güvenliği (Better Auth)" },
  { key: "GEMINI_API_KEY", label: "Google Gemini (AI yazar, seslendirme)" },
  { key: "OPENROUTER_API_KEY", label: "OpenRouter (AI analiz, özet)" },
  { key: "BLOB_READ_WRITE_TOKEN", label: "Vercel Blob (görsel ve ses depolama)" },
  { key: "QSTASH_TOKEN", label: "Upstash QStash (zamanlanmış görevler)" },
  { key: "UPSTASH_REDIS_REST_URL", label: "Upstash Redis (önbellek, hız sınırı)" },
  { key: "RESEND_API_KEY", label: "Resend (e-posta)" },
  { key: "GOOGLE_CLIENT_EMAIL", label: "Google Indexing API" },
  { key: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID"], label: "Telegram paylaşımı" },
  { key: "NEXT_PUBLIC_SENTRY_DSN", label: "Sentry (hata takibi)" },
  { key: "CRON_SECRET", label: "Gece temizliği (Vercel Cron)" },
  { key: "VAPID_PRIVATE_KEY", label: "Tarayıcı bildirimleri (VAPID)" },
] as const;

const TABS = [
  { id: "genel", label: "Genel", icon: SlidersHorizontal, description: "Site adı, logo, SEO, sosyal medya ve tema renkleri." },
  { id: "yapay-zeka", label: "Yapay Zekâ", icon: Sparkles, description: "Modeller, sağlayıcılar ve yapay zekâ talimatları." },
  { id: "otomasyon", label: "Otomasyon", icon: Timer, description: "Zamanlanmış işler (tarama, analiz, AI Yazar, bülten) ve içerik kuralları." },
  { id: "reklam", label: "Reklam ve Analitik", icon: Megaphone, description: "Google Analytics, AdSense, sponsor reklamları ve reklam alanları." },
  { id: "bildirimler", label: "Bildirimler", icon: BellRing, description: "Tarayıcı bildirimleri: ayarlar, haber bildirimi ve gönderim geçmişi." },
  { id: "sistem", label: "Sistem", icon: ServerCog, description: "Veritabanı güncellemeleri ve servis yapılandırması." },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === rawTab) ? (rawTab as TabId) : "genel";
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary-500/20 flex items-center justify-center">
            <Settings2 className="h-5.5 w-5.5 text-primary-500" />
          </div>
          Ayarlar
        </h1>
        <p className="text-muted-foreground text-sm">{active.description}</p>
      </div>

      <nav aria-label="Ayar bölümleri" className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-muted border border-border">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/settings?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={cn(
              "h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all",
              t.id === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.label}</span>
          </Link>
        ))}
      </nav>

      {tab === "genel" && <GeneralTab />}
      {tab === "yapay-zeka" && <AiTab />}
      {tab === "otomasyon" && <AutomationTab />}
      {tab === "reklam" && <MonetizationTab />}
      {tab === "bildirimler" && <NotificationTab />}
      {tab === "sistem" && <SystemTab />}
    </div>
  );
}

async function GeneralTab() {
  const settings = await getAdminSiteSettings();
  return (
    <div className="bg-card rounded-3xl border border-border shadow-soft p-4 sm:p-6 md:p-8">
      <SiteSettingsForm initialSettings={settings} />
    </div>
  );
}

async function AiTab() {
  const overview = await getAiOverview();
  return <AiSettingsPanel {...overview} />;
}

async function AutomationTab() {
  const overview = await getAutomationOverview();
  return <AutomationPanel {...overview} />;
}

async function MonetizationTab() {
  const { settings, sponsors, sentryConfigured, onVercel } = await getMonetizationOverview();
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-3xl border border-border shadow-soft p-4 sm:p-6 md:p-8">
        <MonetizationPanel initial={settings} sentryConfigured={sentryConfigured} onVercel={onVercel} />
      </div>
      <div className="bg-card rounded-3xl border border-border shadow-soft p-4 sm:p-6 md:p-8 space-y-4">
        <h3 className="text-base font-bold font-display">Sponsor reklamları</h3>
        <SponsorManager sponsors={sponsors} />
      </div>
    </div>
  );
}

async function NotificationTab() {
  const overview = await getNotificationOverview();
  return (
    <div className="bg-card rounded-3xl border border-border shadow-soft p-4 sm:p-6 md:p-8">
      <NotificationPanel {...overview} />
    </div>
  );
}

async function SystemTab() {
  let status: MigrationStatus | null = null;
  let dbError: string | null = null;
  try {
    status = await getMigrationStatus();
  } catch (error) {
    console.error("Migration status error:", error);
    dbError = "Veritabanına bağlanılamadı veya durum okunamadı.";
  }
  // Değerlerin kendisi asla istemciye gönderilmez, yalnızca tanımlı olup olmadıkları
  const services = SERVICES.map((s) => ({ label: s.label, configured: [s.key].flat().every((k) => !!process.env[k]) }));
  const indexing = { configured: isIndexingConfigured(), log: await getIndexingLog() };
  return <SystemPanel initialStatus={status} dbError={dbError} services={services} indexing={indexing} />;
}
