"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle, CheckCircle2, Database, Loader2, PlayCircle, RefreshCw, XCircle, CircleDashed, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { applyMigrationsAction, getMigrationStatusAction, runSeoMaintenanceAction } from "../system-actions";
import type { MigrationRunResult, MigrationStatus } from "@/lib/server/db-migrations";

interface Props {
  initialStatus: MigrationStatus | null;
  dbError: string | null;
  services: { label: string; configured: boolean }[];
}


const OUTCOME_LABEL: Record<MigrationRunResult["outcome"], string> = {
  applied: "Uygulandı",
  baselined: "Mevcut olarak işaretlendi",
  failed: "Başarısız",
  skipped: "Atlandı",
};

// Bilinen güncellemeler için anlaşılır Türkçe açıklamalar (yenileri teknik adıyla görünür)
const MIGRATION_TITLES: Record<string, string> = {
  init_postgres_with_slider: "İlk kurulum (temel tablolar)",
  add_rss_processing_claim: "RSS haber işleme kilidi",
  sync_schema_drift: "Google Trends ve analiz alanları",
  add_article_reactions: "Okur tepkileri",
  ai_settings: "Yapay zekâ model ayarları",
  news_stories: "Karar Merkezi (konular ve puanlama)",
  unique_oauth_accounts: "Google ile giriş onarımı",
  article_reads: "Okuma geçmişi (Okuduklarım)",
};

/** Eski haberlerin eksik etiket ve meta açıklamalarını tamamlar */
function SeoMaintenance() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const run = () =>
    start(async () => {
      const res = await runSeoMaintenanceAction();
      setError(!res.success);
      setResult(
        res.success
          ? res.processed === 0
            ? "Tüm yayındaki haberlerin etiketleri tamam."
            : `${res.processed} haber işlendi, ${res.updated} habere etiket eklendi.${res.remaining > 0 ? ` Etiketsiz ${res.remaining} haber kaldı; tekrar çalıştırabilirsiniz.` : ""}`
          : res.error,
      );
    });
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-3 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="font-bold font-display flex items-center gap-2"><Search className="h-4 w-4 text-primary-500" /> SEO Bakımı</h2>
          <p className="text-xs text-muted-foreground max-w-xl">
            Etiketi olmayan haberlere yapay zekâ ile etiket ekler, eksik ya da kısa spotları (Google&apos;daki açıklama) tamamlar.
            Başlık ve haber adresi değiştirilmez. Her çalıştırmada en yeni 10 haber işlenir; yeni haberler bunu zaten otomatik alır.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} {pending ? "İşleniyor…" : "Çalıştır"}
        </button>
      </div>
      {result && <p className={cn("text-sm", error ? "text-error" : "text-foreground")} aria-live="polite">{result}</p>}
    </section>
  );
}

function formatName(name: string) {
  // 20261004120000_sync_schema_drift → 04.10.2026 · Google Trends ve analiz alanları
  const m = name.match(/^(\d{4})(\d{2})(\d{2})\d*_(.+)$/);
  if (!m) return { date: "", title: name };
  return { date: `${m[3]}.${m[2]}.${m[1]}`, title: MIGRATION_TITLES[m[4]] ?? m[4].replace(/_/g, " ") };
}

export function SystemPanel({ initialStatus, dbError, services }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(dbError);
  const [results, setResults] = useState<MigrationRunResult[] | null>(null);
  const [isApplying, startApply] = useTransition();
  const [isRefreshing, startRefresh] = useTransition();

  const refresh = () =>
    startRefresh(async () => {
      const res = await getMigrationStatusAction();
      if (res.success) { setStatus(res.status); setError(null); } else setError(res.error);
    });

  const apply = () => {
    if (!status) return;
    const msg = status.needsBaseline
      ? "Veritabanı daha önce migration geçmişi olmadan kurulmuş. Mevcut tablolar korunarak geçmiş oluşturulacak ve bekleyen güncellemeler uygulanacak. Devam edilsin mi?"
      : `${status.pendingCount} veritabanı güncellemesi uygulanacak. Mevcut veriler korunur. Devam edilsin mi?`;
    if (!confirm(msg)) return;
    startApply(async () => {
      const res = await applyMigrationsAction();
      if (res.success) { setResults(res.results); setStatus(res.status); setError(null); }
      else setError(res.error);
    });
  };

  const pending = status?.pendingCount ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Veritabanı ───────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold font-display">Veritabanı Güncellemeleri</h2>
              <p className="text-xs text-muted-foreground">Uygulamanın yeni sürümünün ihtiyaç duyduğu tablo ve sütunlar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing || isApplying}
            className="self-start sm:self-auto inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} /> Yenile
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {status && (
          <>
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl p-4 border",
                pending === 0 ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30"
              )}
            >
              {pending === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <p className="font-semibold text-foreground">
                  {pending === 0 ? "Veritabanı güncel." : `${pending} güncelleme bekliyor.`}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {pending === 0
                    ? "Yapılması gereken bir işlem yok."
                    : status.needsBaseline
                      ? "Tablolar mevcut ancak güncelleme geçmişi yok (daha önce `db push` ile kurulmuş). Uygula düğmesi mevcut verileri koruyarak geçmişi oluşturur."
                      : "Yeni özelliklerin (ör. okur tepkileri) çalışması için güncellemeleri uygulayın. Mevcut veriler korunur."}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {status.rows.map((row) => {
                const { date, title } = formatName(row.name);
                return (
                  <li key={row.name} className="flex items-center gap-3 px-3 sm:px-4 py-3 bg-background/40">
                    {row.state === "applied" ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : row.state === "failed" ? (
                      <XCircle className="h-4 w-4 text-error shrink-0" />
                    ) : (
                      <CircleDashed className="h-4 w-4 text-warning shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground first-letter:uppercase truncate">{title}</p>
                      <p className="text-xs text-muted-foreground">
                        {date}
                        {row.appliedAt && ` · uygulandı ${new Date(row.appliedAt).toLocaleString("tr-TR")}`}
                        {row.error && <span className="block text-error break-words">{row.error}</span>}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0",
                        row.state === "applied" ? "bg-success/10 text-success"
                          : row.state === "failed" ? "bg-error/10 text-error"
                          : "bg-warning/10 text-warning"
                      )}
                    >
                      {row.state === "applied" ? "Uygulandı" : row.state === "failed" ? "Hata" : "Bekliyor"}
                    </span>
                  </li>
                );
              })}
            </ul>

            {status.unknownApplied.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Veritabanında bu sürümde olmayan güncellemeler var: {status.unknownApplied.join(", ")}
              </p>
            )}

            {pending > 0 && (
              <button
                type="button"
                onClick={apply}
                disabled={isApplying}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold shadow-soft disabled:opacity-60 cursor-pointer"
              >
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                {isApplying ? "Uygulanıyor…" : "Bekleyen güncellemeleri uygula"}
              </button>
            )}
          </>
        )}

        {results && (
          <div className="rounded-xl border border-border p-3 space-y-1.5" aria-live="polite">
            <p className="text-sm font-semibold">Son işlem sonucu</p>
            {results.length === 0 && <p className="text-sm text-muted-foreground">Uygulanacak güncelleme yoktu.</p>}
            {results.map((r) => (
              <p key={r.name} className="text-xs flex flex-wrap gap-x-2">
                <span className={cn("font-bold", r.outcome === "failed" ? "text-error" : r.outcome === "skipped" ? "text-muted-foreground" : "text-success")}>
                  {OUTCOME_LABEL[r.outcome]}
                </span>
                <span className="text-foreground">{formatName(r.name).title}</span>
                {r.durationMs > 0 && <span className="text-muted-foreground">{r.durationMs} ms</span>}
                {r.error && <span className="w-full text-error break-words">{r.error}</span>}
              </p>
            ))}
          </div>
        )}
      </section>

      <SeoMaintenance />

      {/* ── Servis yapılandırması ───────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-3 shadow-card">
        <h2 className="font-bold font-display">Servis Yapılandırması</h2>
        <p className="text-xs text-muted-foreground">Ortam değişkenlerinin tanımlı olup olmadığı (değerler gösterilmez).</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {services.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm rounded-lg border border-border px-3 py-2">
              {s.configured ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className={s.configured ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
