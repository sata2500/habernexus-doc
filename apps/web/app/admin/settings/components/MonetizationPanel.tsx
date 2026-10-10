"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Bug, CheckCircle2, ExternalLink, Info, LayoutTemplate, Loader2, Megaphone, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLACEMENT_KEYS,
  PLACEMENTS,
  type PlacementKey,
  type PlacementMap,
  type PlacementMode,
} from "@/lib/monetization";
import * as Sentry from "@sentry/nextjs";
import { sendSentryTestError, updateMonetizationSettings, type MonetizationSettingsInput } from "../monetization-actions";
import { Field, SectionTitle, TextArea, TextInput } from "./SettingsFields";

type Settings = Omit<MonetizationSettingsInput, "placements"> & { placements: PlacementMap };

const MODE_LABEL: Record<PlacementMode, string> = {
  off: "Kapalı",
  sponsor: "Yalnızca sponsor",
  adsense: "Yalnızca AdSense",
  auto: "Sponsor varsa sponsor, yoksa AdSense",
};

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500" />
      <span className="text-sm">
        <span className="block font-semibold">{label}</span>
        <span className="block text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function StatusPill({ on, onText = "Açık", offText = "Kapalı" }: { on: boolean; onText?: string; offText?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", on ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
      {on ? onText : offText}
    </span>
  );
}

export function MonetizationPanel({ initial, sentryConfigured, onVercel }: { initial: Settings; sentryConfigured: boolean; onVercel: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [saving, startSave] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => { setS({ ...s, [key]: value }); setStatus(null); };
  const setPlacement = (key: PlacementKey, patch: Partial<PlacementMap[PlacementKey]>) =>
    set("placements", { ...s.placements, [key]: { ...s.placements[key], ...patch } });

  const adsenseOn = s.adsenseEnabled && !!s.adsensePublisherId;
  const save = () => startSave(async () => {
    const res = await updateMonetizationSettings(s);
    setStatus(res.success ? { ok: true, text: "Kaydedildi. Site birkaç dakika içinde güncellenir." } : { ok: false, text: res.error });
    if (res.success) router.refresh();
  });

  return (
    <div className="space-y-8">
      {/* ── Ölçüm ── */}
      <section className="space-y-4">
        <SectionTitle icon={BarChart3}>Ziyaret ölçümü</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <Toggle
              checked={s.gaEnabled}
              onChange={(v) => set("gaEnabled", v)}
              label="Google Analytics"
              description="Yalnızca çerez bandında “Ziyaret istatistikleri”ne izin veren okurlarda çalışır."
            />
            <Field label="Ölçüm kimliği" icon={BarChart3} hint="Google Analytics → Yönetici → Veri akışları → web akışındaki “Ölçüm kimliği”.">
              {(p) => <TextInput {...p} value={s.gaMeasurementId ?? ""} onChange={(v) => set("gaMeasurementId", v.trim().toUpperCase())} placeholder="G-XXXXXXXXXX" />}
            </Field>
          </div>
          <div className="space-y-3">
            <Toggle
              checked={s.vercelAnalyticsEnabled}
              onChange={(v) => set("vercelAnalyticsEnabled", v)}
              label="Vercel Web Analytics"
              description="Çerez kullanmaz, onay gerektirmez. Vercel proje panelinde Analytics bölümünün de açılması gerekir; ücretsiz planda aylık olay sınırı vardır."
            />
            {!onVercel && s.vercelAnalyticsEnabled && (
              <p className="text-xs text-muted-foreground flex gap-1.5"><Info className="h-3.5 w-3.5 shrink-0" />Yalnızca Vercel&apos;de yayındaki sitede veri toplar.</p>
            )}
            <div className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
              <Bug className="h-4 w-4 mt-0.5 text-primary-500 shrink-0" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold flex items-center gap-2">Sentry hata takibi <StatusPill on={sentryConfigured} onText="Bağlı" offText="Bağlı değil" /></p>
                <p className="text-muted-foreground">Vercel ortam değişkenlerine <code>NEXT_PUBLIC_SENTRY_DSN</code> eklenince kendiliğinden çalışır; buradan açılıp kapanmaz.</p>
                {sentryConfigured && <SentryTest />}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AdSense ── */}
      <section className="space-y-4">
        <SectionTitle icon={Megaphone}>Google AdSense</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <Toggle
              checked={s.adsenseEnabled}
              onChange={(v) => set("adsenseEnabled", v)}
              label="AdSense reklamlarını göster"
              description="Kapalıyken AdSense betiği hiç yüklenmez. Okur çerez bandında izin vermezse reklamlar kişiselleştirilmeden gösterilir."
            />
            <Field label="Yayıncı kimliği" icon={Megaphone} hint="AdSense → Hesap → Hesap bilgileri → “Yayıncı kimliği”. Başına ca- ekleyin.">
              {(p) => <TextInput {...p} value={s.adsensePublisherId ?? ""} onChange={(v) => set("adsensePublisherId", v.trim())} placeholder="ca-pub-1234567890123456" />}
            </Field>
          </div>
          <div className="space-y-3">
            <Field label="ads.txt ek satırları" icon={Info} hint="AdSense satırı kimlikten otomatik oluşur. Başka reklam ağlarının verdiği satırları buraya ekleyin.">
              {(p) => <TextArea {...p} value={s.adsTxtExtra ?? ""} onChange={(v) => set("adsTxtExtra", v)} rows={4} placeholder="ornek-ag.com, 12345, DIRECT" />}
            </Field>
            <a href="/ads.txt" target="_blank" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500">
              Yayındaki ads.txt dosyasını gör <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Reklam alanları ── */}
      <section className="space-y-4">
        <SectionTitle icon={LayoutTemplate}>Reklam alanları</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Her alan için reklamın nereden geleceğini seçin. AdSense kullanan alanlara, AdSense&apos;te oluşturduğunuz <strong>görüntülü reklam biriminin</strong> kimliğini (data-ad-slot) girin.
          Gösterilecek reklam yoksa alan sayfada hiç görünmez.
        </p>
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {PLACEMENT_KEYS.map((key) => {
            const p = s.placements[key];
            const usesAdsense = p.mode === "adsense" || p.mode === "auto";
            return (
              <li key={key} className="p-3 sm:p-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{PLACEMENTS[key].label}</p>
                  <p className="text-xs text-muted-foreground">{PLACEMENTS[key].format === "banner" ? "Yatay alan" : "Kare alan (300×250)"}</p>
                </div>
                <select
                  aria-label={`${PLACEMENTS[key].label}: reklam kaynağı`}
                  value={p.mode}
                  onChange={(e) => setPlacement(key, { mode: e.target.value as PlacementMode })}
                  className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                >
                  {(Object.keys(MODE_LABEL) as PlacementMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
                </select>
                <input
                  aria-label={`${PLACEMENTS[key].label}: AdSense reklam birimi kimliği`}
                  value={p.adsenseSlot ?? ""}
                  onChange={(e) => setPlacement(key, { adsenseSlot: e.target.value.replace(/\D/g, "") || undefined })}
                  placeholder="Reklam birimi kimliği"
                  disabled={!usesAdsense}
                  inputMode="numeric"
                  className="h-10 w-full md:w-48 rounded-xl border border-border bg-card px-3 text-sm disabled:opacity-40"
                />
                {usesAdsense && (!adsenseOn || !p.adsenseSlot) && (
                  <p className="md:col-span-3 text-xs text-warning flex gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    {!adsenseOn ? "AdSense kapalı: bu alanda yalnızca sponsor reklamı gösterilebilir." : "Reklam birimi kimliği girilmeden AdSense reklamı gösterilemez."}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 md:-mx-8 border-t border-border bg-card/95 backdrop-blur px-4 sm:px-6 md:px-8 py-3 flex flex-wrap items-center justify-end gap-3">
        {status && (
          <span role="status" className={cn("text-sm inline-flex items-center gap-1.5", status.ok ? "text-success" : "text-error")}>
            {status.ok && <CheckCircle2 className="h-4 w-4" />} {status.text}
          </span>
        )}
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Ayarları kaydet
        </button>
      </div>
    </div>
  );
}

/** Sentry'ye sunucudan ve tarayıcıdan birer deneme hatası gönderir; Sentry → Issues'da görünmeleri gerekir */
function SentryTest() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const server = () => start(async () => {
    const r = await sendSentryTestError();
    setResult(r.success ? { ok: true, text: `Sunucu deneme hatası gönderildi (kimlik: ${r.data.eventId.slice(0, 8)}…). Sentry → Issues'a bakın.` } : { ok: false, text: r.error });
  });
  const browser = async () => {
    if (!Sentry.getClient()) {
      setResult({ ok: false, text: "Sentry tarayıcıda etkin değil. DSN eklendikten sonra site yeniden yayına alınmalı; reklam engelleyici de engelliyor olabilir." });
      return;
    }
    const id = Sentry.captureException(new Error("HaberNexus Sentry deneme hatası (tarayıcı)"), { tags: { test: "admin-panel" } });
    await Sentry.flush(5_000);
    setResult({ ok: true, text: `Tarayıcı deneme hatası gönderildi (kimlik: ${id.slice(0, 8)}…). Sentry → Issues'a bakın.` });
  };

  return (
    <div className="pt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={server} disabled={pending} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bug className="h-3.5 w-3.5" />} Sunucudan deneme hatası
        </button>
        <button type="button" onClick={browser} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted">
          <Bug className="h-3.5 w-3.5" /> Tarayıcıdan deneme hatası
        </button>
      </div>
      {result && <p role="status" className={cn("text-xs", result.ok ? "text-success" : "text-error")}>{result.text}</p>}
    </div>
  );
}
