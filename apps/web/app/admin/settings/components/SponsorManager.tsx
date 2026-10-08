"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, MousePointerClick, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn, SITE_TIME_ZONE } from "@/lib/utils";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { FORMAT_SIZES, PLACEMENT_KEYS, PLACEMENTS, type PlacementKey } from "@/lib/monetization";
import { deleteSponsorAd, saveSponsorAd, setSponsorActive } from "../monetization-actions";

export interface SponsorRow {
  id: string;
  name: string;
  advertiser: string | null;
  imageUrl: string;
  imageUrlMobile: string | null;
  linkUrl: string;
  altText: string;
  placements: string[];
  isActive: boolean;
  startsAt: Date;
  endsAt: Date | null;
  weight: number;
  impressions: number;
  clicks: number;
}

type FormState = {
  id?: string; name: string; advertiser: string; imageUrl: string; imageUrlMobile: string; linkUrl: string; altText: string;
  placements: PlacementKey[]; isActive: boolean; startsAt: string; endsAt: string; weight: number;
};

const EMPTY: FormState = {
  name: "", advertiser: "", imageUrl: "", imageUrlMobile: "", linkUrl: "", altText: "",
  placements: [], isActive: true, startsAt: "", endsAt: "", weight: 1,
};

const inputClass = "w-full h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500";

/** Date → <input type="datetime-local"> değeri (yerel saat) */
function toLocalInput(d: Date | null) {
  if (!d) return "";
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
const toIso = (v: string) => (v ? new Date(v).toISOString() : "");
const shortDate = (d: Date) => new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: SITE_TIME_ZONE });

function sponsorState(s: SponsorRow, now: number) {
  if (!s.isActive) return { label: "Durduruldu", cls: "bg-muted text-muted-foreground" };
  if (new Date(s.startsAt).getTime() > now) return { label: `Planlandı · ${shortDate(s.startsAt)}`, cls: "bg-primary-500/10 text-primary-500" };
  if (s.endsAt && new Date(s.endsAt).getTime() <= now) return { label: "Süresi doldu", cls: "bg-warning/10 text-warning" };
  return { label: s.endsAt ? `Yayında · ${shortDate(s.endsAt)} tarihine kadar` : "Yayında", cls: "bg-success/10 text-success" };
}

export function SponsorManager({ sponsors }: { sponsors: SponsorRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const act = (fn: () => Promise<{ success: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.success) { setError(res.error ?? "İşlem başarısız."); return; }
      after?.();
      router.refresh();
    });

  const edit = (s: SponsorRow) => setForm({
    id: s.id, name: s.name, advertiser: s.advertiser ?? "", imageUrl: s.imageUrl, imageUrlMobile: s.imageUrlMobile ?? "",
    linkUrl: s.linkUrl, altText: s.altText, placements: s.placements.filter((p): p is PlacementKey => p in PLACEMENTS),
    isActive: s.isActive, startsAt: toLocalInput(s.startsAt), endsAt: toLocalInput(s.endsAt), weight: s.weight,
  });

  const submit = () => form && act(
    () => saveSponsorAd({ ...form, startsAt: toIso(form.startsAt), endsAt: toIso(form.endsAt) }),
    () => setForm(null),
  );

  const hasBanner = form?.placements.some((p) => PLACEMENTS[p].format === "banner");
  const hasBox = form?.placements.some((p) => PLACEMENTS[p].format === "box");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Kendi sattığınız reklamlar. Seçtiğiniz alanlarda, tarih aralığı içinde gösterilir; aynı alanda birden çok sponsor varsa ağırlıklarına göre sırayla döner.
          Reklamlar sitede “Sponsorlu” etiketiyle görünür.
        </p>
        {!form && (
          <button type="button" onClick={() => { setForm(EMPTY); setError(null); }} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold">
            <Plus className="h-4 w-4" /> Yeni sponsor reklamı
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-error">{error}</p>}

      {form && (
        <div className="rounded-2xl border border-primary-500/30 bg-muted/20 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{form.id ? "Sponsor reklamını düzenle" : "Yeni sponsor reklamı"}</h4>
            <button type="button" onClick={() => setForm(null)} aria-label="Formu kapat" className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 block"><span className="text-xs font-semibold">Reklam adı (yalnızca panelde görünür)</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ör. Ekim kampanyası" />
            </label>
            <label className="space-y-1 block"><span className="text-xs font-semibold">Reklam veren (etikette görünür, isteğe bağlı)</span>
              <input value={form.advertiser} onChange={(e) => setForm({ ...form, advertiser: e.target.value })} className={inputClass} placeholder="Ör. Örnek Şirket" />
            </label>
            <label className="space-y-1 block sm:col-span-2"><span className="text-xs font-semibold">Tıklanınca gidilecek adres</span>
              <input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} className={inputClass} placeholder="https://" inputMode="url" />
            </label>
            <label className="space-y-1 block sm:col-span-2"><span className="text-xs font-semibold">Görsel açıklaması (görme engelli okurlar için)</span>
              <input value={form.altText} onChange={(e) => setForm({ ...form, altText: e.target.value })} className={inputClass} placeholder="Ör. Örnek Şirket yeni ürününü tanıtıyor" />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold mb-1">Gösterileceği alanlar</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLACEMENT_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.placements.includes(key)}
                    onChange={(e) => setForm({ ...form, placements: e.target.checked ? [...form.placements, key] : form.placements.filter((p) => p !== key) })}
                    className="h-4 w-4 accent-primary-500"
                  />
                  {PLACEMENTS[key].label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs font-semibold block">Görsel</span>
              <ImageUploader value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} type="article" objectFit="contain" />
              <p className="text-xs text-muted-foreground">
                {hasBanner && <>Yatay alanlar için {FORMAT_SIZES.banner.desktop}. </>}
                {hasBox && <>Kare alan için {FORMAT_SIZES.box.desktop}.</>}
                {!hasBanner && !hasBox && "Önce alanları seçin; önerilen boyut gösterilir."}
              </p>
            </div>
            {hasBanner && (
              <div className="space-y-1">
                <span className="text-xs font-semibold block">Telefon görseli (isteğe bağlı)</span>
                <ImageUploader value={form.imageUrlMobile} onChange={(url) => setForm({ ...form, imageUrlMobile: url })} type="article" objectFit="contain" />
                <p className="text-xs text-muted-foreground">Yatay alanlarda telefonda gösterilir: {FORMAT_SIZES.banner.mobile}.</p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 block"><span className="text-xs font-semibold">Başlangıç (boşsa hemen)</span>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputClass} />
            </label>
            <label className="space-y-1 block"><span className="text-xs font-semibold">Bitiş (boşsa süresiz)</span>
              <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputClass} />
            </label>
            <label className="space-y-1 block"><span className="text-xs font-semibold">Gösterim payı (1–100)</span>
              <input type="number" min={1} max={100} value={form.weight} onChange={(e) => setForm({ ...form, weight: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} className={inputClass} />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-primary-500" />
            Yayında (kapalıysa tarih aralığı gelse de gösterilmez)
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="h-10 px-4 rounded-xl border border-border text-sm font-semibold">Vazgeç</button>
            <button type="button" onClick={submit} disabled={pending} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet
            </button>
          </div>
        </div>
      )}

      {sponsors.length === 0 && !form ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Henüz sponsor reklamı yok. “Yeni sponsor reklamı” ile ekleyin; reklam alanlarında kaynağı “Yalnızca sponsor” ya da “Sponsor varsa sponsor” olarak seçmeyi unutmayın.
        </p>
      ) : (
        <ul className="space-y-2">
          {sponsors.map((s) => {
            const state = sponsorState(s, now);
            const ctr = s.impressions > 0 ? ((s.clicks / s.impressions) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 }) : "–";
            return (
              <li key={s.id} className="rounded-2xl border border-border bg-card p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- yönetim önizlemesi, dış adresli reklam görseli */}
                <img src={s.imageUrl} alt="" className={cn("h-16 w-full sm:w-40 rounded-lg object-contain bg-muted shrink-0", !s.isActive && "opacity-40")} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold text-sm truncate">{s.name}{s.advertiser && <span className="font-normal text-muted-foreground"> · {s.advertiser}</span>}</p>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className={cn("rounded-full px-2 py-0.5 font-semibold", state.cls)}>{state.label}</span>
                    {s.placements.map((p) => (
                      <span key={p} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{PLACEMENTS[p as PlacementKey]?.label ?? p}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums flex flex-wrap gap-x-3">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {s.impressions.toLocaleString("tr-TR")} gösterim</span>
                    <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" /> {s.clicks.toLocaleString("tr-TR")} tıklama</span>
                    <span>Tıklanma oranı %{ctr}</span>
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => edit(s)} aria-label={`${s.name}: düzenle`} className="p-2 rounded-lg hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => act(() => setSponsorActive(s.id, !s.isActive))} aria-label={`${s.name}: ${s.isActive ? "durdur" : "yayına al"}`} className="p-2 rounded-lg hover:bg-muted">
                    {s.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {confirmDelete === s.id ? (
                    <button type="button" onClick={() => act(() => deleteSponsorAd(s.id), () => setConfirmDelete(null))} className="px-2 rounded-lg bg-error text-white text-xs font-semibold">Silinsin mi?</button>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(s.id)} aria-label={`${s.name}: sil`} className="p-2 rounded-lg hover:bg-muted text-error"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
