"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Play, Save, XCircle } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AutomationJob, JobStatus } from "@/lib/server/automation";
import { configureJobAction, runJobNowAction, saveContentRules, type ContentRules } from "../automation-actions";

const JOB_INFO: Record<AutomationJob, { label: string; description: string; frequencies: { cron: string; label: string }[] | null; runnable: boolean }> = {
  scan: {
    label: "RSS tarama ve Google Trends",
    description: "Kaynaklardan yeni haberleri çeker, trendleri günceller ve trende uyan haberleri öne alır.",
    frequencies: [
      { cron: "0 * * * *", label: "Saatte bir" },
      { cron: "0 */2 * * *", label: "2 saatte bir" },
      { cron: "0 */4 * * *", label: "4 saatte bir" },
      { cron: "0 */6 * * *", label: "6 saatte bir" },
      { cron: "0 */12 * * *", label: "12 saatte bir" },
    ],
    runnable: true,
  },
  analyze: {
    label: "Yapay zekâ ile analiz",
    description: "Yeni haberleri puanlar, tekrarları ayıklar, eski kayıtları temizler.",
    frequencies: [
      { cron: "0 * * * *", label: "Saatte bir" },
      { cron: "0 */2 * * *", label: "2 saatte bir" },
      { cron: "0 */4 * * *", label: "4 saatte bir" },
      { cron: "0 */6 * * *", label: "6 saatte bir" },
      { cron: "0 */12 * * *", label: "12 saatte bir" },
    ],
    runnable: true,
  },
  writer: {
    label: "AI Yazar",
    description: "En iyi puanlı önerilerden haber yazıp yayınlar.",
    frequencies: [
      { cron: "0 */2 * * *", label: "2 saatte bir" },
      { cron: "0 */4 * * *", label: "4 saatte bir" },
      { cron: "0 */6 * * *", label: "6 saatte bir" },
      { cron: "0 */12 * * *", label: "12 saatte bir" },
      { cron: "0 9 * * *", label: "Günde bir (09:00)" },
    ],
    runnable: true,
  },
  newsletter: {
    label: "E-posta bülteni",
    description: "Her saat başı, o saati seçen abonelere günün haberlerini gönderir.",
    frequencies: null,
    runnable: false,
  },
};

const ORDER: AutomationJob[] = ["scan", "analyze", "writer", "newsletter"];

function StatusLine({ s }: { s: JobStatus }) {
  if (!s.enabled) return <span className="text-muted-foreground">Kapalı</span>;
  if (s.live === false) {
    return (
      <span className="text-warning flex items-center gap-1">
        <AlertTriangle className="h-3.5 w-3.5" /> Upstash&apos;te zamanlama bulunamadı; kapatıp yeniden açın.
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
      <span className={cn("font-semibold", s.paused ? "text-warning" : "text-success")}>{s.paused ? "Duraklatıldı" : "Aktif"}</span>
      {s.lastRunAt && (
        <span className="flex items-center gap-1">
          · son: {formatRelativeTime(s.lastRunAt)}
          {s.lastResult === "fail" && <XCircle className="h-3.5 w-3.5 text-error" aria-label="başarısız" />}
          {s.lastResult === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-label="başarılı" />}
        </span>
      )}
      {s.nextRunAt && <span>· sonraki: {new Date(s.nextRunAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>}
    </span>
  );
}

function NumberField({ label, help, value, onChange, min, max, suffix }: {
  label: string; help: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      <span className="block text-xs text-muted-foreground">{help}</span>
      <span className="flex items-center gap-2">
        <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </span>
    </label>
  );
}

export function AutomationPanel({ qstash, jobs: initialJobs, rules: initialRules }: { qstash: boolean; jobs: JobStatus[]; rules: ContentRules }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [busy, setBusy] = useState<AutomationJob | null>(null);
  const [messages, setMessages] = useState<Partial<Record<AutomationJob, { ok: boolean; text: string }>>>({});
  const [rules, setRules] = useState(initialRules);
  const [rulesMsg, setRulesMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSaving, startSave] = useTransition();

  const setMsg = (job: AutomationJob, ok: boolean, text: string) => setMessages((m) => ({ ...m, [job]: { ok, text } }));

  const configure = async (job: AutomationJob, enabled: boolean, cron?: string) => {
    setBusy(job);
    const res = await configureJobAction(job, enabled, cron);
    if (res.success) { setJobs(res.jobs); setMsg(job, true, enabled ? "Zamanlama kaydedildi." : "Otomasyon kapatıldı."); }
    else setMsg(job, false, res.error);
    setBusy(null);
  };

  const runNow = async (job: AutomationJob) => {
    setBusy(job);
    setMsg(job, true, "Çalışıyor… Bu işlem birkaç dakika sürebilir.");
    const res = await runJobNowAction(job);
    setMsg(job, res.success, res.success ? res.message : res.error);
    setBusy(null);
  };

  const set = <K extends keyof ContentRules>(key: K, value: ContentRules[K]) => setRules((r) => ({ ...r, [key]: value }));

  return (
    <div className="space-y-6">
      {!qstash && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p>Zamanlanmış işler için <strong>QSTASH_TOKEN</strong> gerekli. Yine de işleri &quot;Şimdi çalıştır&quot; ile elle başlatabilirsiniz.</p>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border">
        <div className="p-4 sm:p-6">
          <h2 className="font-bold font-display">Zamanlanmış işler</h2>
          <p className="text-xs text-muted-foreground">Haber akışı bu işlerle otomatik ilerler: tara → analiz et → yaz.</p>
        </div>
        {ORDER.map((job) => {
          const s = jobs.find((j) => j.job === job)!;
          const info = JOB_INFO[job];
          const known = info.frequencies?.some((f) => f.cron === s.cron);
          const msg = messages[job];
          return (
            <div key={job} className="p-4 sm:px-6 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                  <div className="mt-1 text-xs"><StatusLine s={s} /></div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.enabled}
                  aria-label={`${info.label} otomasyonu`}
                  disabled={busy === job}
                  onClick={() => configure(job, !s.enabled, s.cron)}
                  className={cn(
                    "relative shrink-0 h-7 w-12 rounded-full transition-colors cursor-pointer disabled:opacity-60",
                    s.enabled ? "bg-primary-500" : "bg-muted border border-border"
                  )}
                >
                  <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", s.enabled ? "left-6" : "left-1")} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {info.frequencies && (
                  <label className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={known ? s.cron : "custom"}
                      disabled={busy === job}
                      onChange={(e) => e.target.value !== "custom" && configure(job, s.enabled, e.target.value)}
                      className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
                      aria-label="Sıklık"
                    >
                      {!known && <option value="custom">Özel ({s.cron})</option>}
                      {info.frequencies.map((f) => <option key={f.cron} value={f.cron}>{f.label}</option>)}
                    </select>
                  </label>
                )}
                {info.runnable && (
                  <button
                    type="button"
                    onClick={() => runNow(job)}
                    disabled={busy === job}
                    className="h-9 px-3 rounded-lg border border-border bg-muted text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-muted/70 disabled:opacity-60 cursor-pointer"
                  >
                    {busy === job ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Şimdi çalıştır
                  </button>
                )}
              </div>

              {msg && (
                <p className={cn("text-xs break-words", msg.ok ? "text-muted-foreground" : "text-error")} aria-live="polite">{msg.text}</p>
              )}
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card p-4 sm:p-6 space-y-5">
        <div>
          <h2 className="font-bold font-display">İçerik kuralları</h2>
          <p className="text-xs text-muted-foreground">Otomasyonların hangi haberleri, ne kadar işleyeceği.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <NumberField label="Haber başına yazım" help="AI Yazar her çalıştığında en fazla kaç haber yazsın." value={rules.aiWriterAutoCount} onChange={(v) => set("aiWriterAutoCount", v)} min={1} max={10} suffix="haber" />
          <NumberField label="En eski haber yaşı" help="Bundan eski RSS haberleri alınmaz (0 = sınırsız)." value={rules.maxNewsAgeHours} onChange={(v) => set("maxNewsAgeHours", v)} min={0} max={720} suffix="saat" />
          <NumberField label="Kayıt saklama süresi" help="Kullanılmayan RSS kayıtları bu süreden sonra silinir." value={rules.rssRetentionDays} onChange={(v) => set("rssRetentionDays", v)} min={1} max={365} suffix="gün" />
          <NumberField label="Trend öncelik eşiği" help="Trendle bu oranın üzerinde eşleşen haberler öne alınır." value={rules.trendAutoPublishThreshold} onChange={(v) => set("trendAutoPublishThreshold", v)} min={0} max={100} suffix="%" />
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
            <input type="checkbox" checked={rules.googleTrendsEnabled} onChange={(e) => set("googleTrendsEnabled", e.target.checked)} className="mt-1 h-4 w-4 accent-primary-500" />
            <span className="flex-1">
              <span className="block text-sm font-medium">Google Trends takibi</span>
              <span className="block text-xs text-muted-foreground">RSS taramasıyla birlikte trendler güncellenir.</span>
            </span>
            <input
              value={rules.googleTrendsGeo}
              onChange={(e) => set("googleTrendsGeo", e.target.value.toUpperCase().slice(0, 2))}
              aria-label="Ülke kodu"
              className="w-14 h-9 px-2 text-center rounded-lg border border-border bg-background text-sm font-semibold uppercase"
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
            <input type="checkbox" checked={rules.trendSearchGenerateEnabled} onChange={(e) => set("trendSearchGenerateEnabled", e.target.checked)} className="mt-1 h-4 w-4 accent-primary-500" />
            <span>
              <span className="block text-sm font-medium">Haberi olmayan trendleri işaretle</span>
              <span className="block text-xs text-muted-foreground">RSS&apos;te karşılığı olmayan popüler trendler Google Trends sayfasında yazılmak üzere önerilir.</span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => startSave(async () => {
              const res = await saveContentRules(rules);
              setRulesMsg(res.success ? { ok: true, text: "Kurallar kaydedildi." } : { ok: false, text: res.error });
            })}
            disabled={isSaving}
            className="h-11 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
          </button>
          {rulesMsg && <p className={cn("text-sm", rulesMsg.ok ? "text-success" : "text-error")} aria-live="polite">{rulesMsg.text}</p>}
        </div>
      </section>
    </div>
  );
}
