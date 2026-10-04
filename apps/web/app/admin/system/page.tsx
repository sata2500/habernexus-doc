import { ServerCog } from "lucide-react";
import { requireRole } from "@/lib/server/authz";
import { getMigrationStatus, type MigrationStatus } from "@/lib/server/db-migrations";
import { SystemClient } from "./SystemClient";

export const dynamic = "force-dynamic";
// Uzun migration'lar için (ör. ilk kurulum) yeterli süre
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
  { key: "TELEGRAM_BOT_TOKEN", label: "Telegram paylaşımı" },
] as const;

export default async function AdminSystemPage() {
  await requireRole("ADMIN");

  let status: MigrationStatus | null = null;
  let dbError: string | null = null;
  try {
    status = await getMigrationStatus();
  } catch (error) {
    console.error("Migration status error:", error);
    dbError = "Veritabanına bağlanılamadı veya durum okunamadı.";
  }

  // Değerlerin kendisi asla istemciye gönderilmez, yalnızca tanımlı olup olmadıkları
  const services = SERVICES.map((s) => ({ label: s.label, configured: !!process.env[s.key] }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary-500/20 flex items-center justify-center">
            <ServerCog className="h-6 w-6 text-primary-500" />
          </div>
          Sistem Durumu
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Veritabanı güncellemelerini uygulayın ve dış servislerin çalışıp çalışmadığını kontrol edin.
        </p>
      </div>

      <SystemClient initialStatus={status} dbError={dbError} services={services} />
    </div>
  );
}
