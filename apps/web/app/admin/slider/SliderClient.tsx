"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Images, Loader2, Newspaper, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { cn } from "@/lib/utils";
import {
  deleteSlide, reorderSlides, saveSlide, searchArticlesForSlide, setSlideActive, updateSliderSettings,
} from "@/app/actions/slider";

interface SlideRow {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  link: string | null;
  isActive: boolean;
  startTime: Date | null;
  endTime: Date | null;
}

interface SliderData {
  autoPlay: boolean;
  interval: number;
  isActive: boolean;
  slides: SlideRow[];
}

type FormState = { id?: string; title: string; description: string; imageUrl: string; link: string; isActive: boolean; startTime: string; endTime: string };

const EMPTY: FormState = { title: "", description: "", imageUrl: "", link: "", isActive: true, startTime: "", endTime: "" };
const INTERVALS = [3000, 5000, 7000, 10000];
const inputClass = "w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

/** Date → <input type="datetime-local"> değeri (yerel saat) */
function toLocalInput(d: Date | null) {
  if (!d) return "";
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function slideState(s: SlideRow, now: number) {
  if (!s.isActive) return { label: "Gizli", cls: "bg-muted text-muted-foreground" };
  if (s.startTime && new Date(s.startTime).getTime() > now) return { label: `Planlandı · ${new Date(s.startTime).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`, cls: "bg-primary-500/10 text-primary-500" };
  if (s.endTime && new Date(s.endTime).getTime() <= now) return { label: "Süresi doldu", cls: "bg-warning/10 text-warning" };
  return { label: s.endTime ? `Yayında · ${new Date(s.endTime).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} tarihine kadar` : "Yayında", cls: "bg-success/10 text-success" };
}

export function SliderClient({ slider }: { slider: SliderData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slides, setSlides] = useState(slider.slides);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  // Sunucudan yeni veri gelince listeyi güncelle
  const [prevSlides, setPrevSlides] = useState(slider.slides);
  if (slider.slides !== prevSlides) {
    setPrevSlides(slider.slides);
    setSlides(slider.slides);
  }

  const act = (fn: () => Promise<{ success: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.success) alert(res.error ?? "İşlem başarısız.");
      router.refresh();
    });

  const updateSettings = (patch: Partial<Pick<SliderData, "autoPlay" | "interval" | "isActive">>) =>
    act(() => updateSliderSettings({ autoPlay: slider.autoPlay, interval: slider.interval, isActive: slider.isActive, ...patch }));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    setSlides(next);
    act(() => reorderSlides(next.map((s) => s.id)));
  };

  const openEdit = (s: SlideRow) => {
    setForm({
      id: s.id, title: s.title ?? "", description: s.description ?? "", imageUrl: s.imageUrl, link: s.link ?? "",
      isActive: s.isActive, startTime: toLocalInput(s.startTime), endTime: toLocalInput(s.endTime),
    });
    setError(null);
  };

  const save = () => {
    if (!form) return;
    setError(null);
    startTransition(async () => {
      const res = await saveSlide({
        ...form,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
      });
      if (!res.success) { setError(res.error); return; }
      setForm(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      {/* Ayarlar */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card flex flex-wrap items-center gap-x-6 gap-y-3">
        <Toggle label="Ana sayfada göster" checked={slider.isActive} disabled={isPending} onChange={(v) => updateSettings({ isActive: v })} />
        <Toggle label="Otomatik geçiş" checked={slider.autoPlay} disabled={isPending} onChange={(v) => updateSettings({ autoPlay: v })} />
        <label className="flex items-center gap-2 text-sm">
          Geçiş süresi
          <select
            value={INTERVALS.includes(slider.interval) ? slider.interval : 5000}
            disabled={isPending || !slider.autoPlay}
            onChange={(e) => updateSettings({ interval: Number(e.target.value) })}
            className="h-9 rounded-xl border border-border bg-background px-2 text-sm disabled:opacity-50"
          >
            {INTERVALS.map((ms) => <option key={ms} value={ms}>{ms / 1000} sn</option>)}
          </select>
        </label>
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </section>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold font-display">Slaytlar <span className="text-sm font-normal text-muted-foreground">({slides.length})</span></h2>
        <button onClick={() => { setForm(EMPTY); setError(null); }} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold">
          <Plus className="h-4 w-4" /> Yeni slayt
        </button>
      </div>

      {slides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Images className="h-10 w-10 mx-auto mb-3 opacity-30" />
          Henüz slayt yok. Slayt eklemezseniz ana sayfada slider alanı görünmez.
        </div>
      ) : (
        <ul className="space-y-2">
          {slides.map((s, i) => {
            const state = slideState(s, now);
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 shadow-card min-w-0">
                <div className="flex flex-col shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0 || isPending} aria-label="Yukarı taşı" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === slides.length - 1 || isPending} aria-label="Aşağı taşı" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt="" className={cn("h-16 w-24 sm:w-32 rounded-lg object-cover shrink-0 bg-muted", !s.isActive && "opacity-40")} />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold truncate">{s.title || "Başlıksız slayt"}</p>
                  <span className={cn("inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-bold", state.cls)}>{state.label}</span>
                  {s.link && <p className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground truncate"><ExternalLink className="h-3 w-3 shrink-0" />{s.link}</p>}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0">
                  <button
                    role="switch"
                    aria-checked={s.isActive}
                    aria-label={s.isActive ? "Gizle" : "Göster"}
                    disabled={isPending}
                    onClick={() => act(() => setSlideActive(s.id, !s.isActive))}
                    className={cn("relative h-6 w-11 rounded-full transition-colors disabled:opacity-50", s.isActive ? "bg-success" : "bg-muted-foreground/30")}
                  >
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", s.isActive ? "left-[22px]" : "left-0.5")} />
                  </button>
                  <div className="flex">
                    <button onClick={() => openEdit(s)} aria-label="Düzenle" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => { if (confirm("Bu slayt silinsin mi?")) act(() => deleteSlide(s.id)); }} aria-label="Sil" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-error/10 hover:text-error">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {form && (
        <SlideForm
          form={form}
          setForm={setForm}
          error={error}
          saving={isPending}
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 text-sm cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition-colors disabled:opacity-50", checked ? "bg-success" : "bg-muted-foreground/30")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      {label}
    </label>
  );
}

type ArticleHit = Awaited<ReturnType<typeof searchArticlesForSlide>>[number];

function SlideForm({ form, setForm, error, saving, onSave, onClose }: {
  form: FormState;
  setForm: (f: FormState) => void;
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ArticleHit[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => {
    if (!picker) return;
    let cancelled = false;
    const t = setTimeout(() => {
      searchArticlesForSlide(q).then((r) => { if (!cancelled) setHits(r); }).catch(() => { if (!cancelled) setHits([]); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [picker, q]);

  const pick = (a: ArticleHit) => {
    setForm({ ...form, title: a.title, description: a.excerpt ?? "", imageUrl: a.coverImage || form.imageUrl, link: `/article/${a.slug}` });
    setPicker(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="slide-form-title" onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 id="slide-form-title" className="font-bold font-display">{form.id ? "Slaytı düzenle" : "Yeni slayt"}</h2>
          <button onClick={onClose} aria-label="Kapat" className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <button type="button" onClick={() => setPicker(!picker)} className="inline-flex items-center gap-2 text-sm font-semibold text-primary-500">
              <Newspaper className="h-4 w-4" /> Bir haberden doldur
            </button>
            {picker && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Haber başlığı ara" className={cn(inputClass, "pl-9")} />
                </div>
                <ul className="max-h-56 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-card">
                  {hits === null && <li className="p-3 text-xs text-muted-foreground">Yükleniyor…</li>}
                  {hits?.length === 0 && <li className="p-3 text-xs text-muted-foreground">Haber bulunamadı.</li>}
                  {hits?.map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => pick(a)} className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted">
                        {a.coverImage
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={a.coverImage} alt="" className="h-9 w-14 rounded object-cover shrink-0" />
                          : <span className="h-9 w-14 rounded bg-muted shrink-0" />}
                        <span className="text-xs font-medium line-clamp-2">{a.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold">Görsel</span>
            <ImageUploader value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} type="article" autoOptimize />
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold">Başlık</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Kısa açıklama</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={cn(inputClass, "h-auto py-2 resize-none")} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Bağlantı <span className="font-normal text-muted-foreground">(isteğe bağlı; ör. /article/... veya https://...)</span></span>
            <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={inputClass} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold">Gösterim başlangıcı</span>
              <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold">Gösterim bitişi</span>
              <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputClass} />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">Boş bırakırsanız slayt hemen ve süresiz gösterilir.</p>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-primary-500" />
            Aktif
          </label>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
          {error && <p role="alert" className="w-full text-sm text-error">{error}</p>}
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-sm font-semibold hover:bg-muted">Vazgeç</button>
          <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {form.id ? "Kaydet" : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
