"use client";

import { confirmDialog, toast } from "@/components/ui/feedback";


import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Info, Loader2, Pencil, Plus, Sparkles, Trash2, Users, X } from "lucide-react";
import { createPersona, updatePersona, deletePersona, setPersonaActive, type PersonaInput } from "../actions";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

export interface PersonaView {
  id: string;
  name: string;
  role: string | null;
  image: string | null;
  description: string | null;
  prompt: string;
  imagePrompt: string;
  isActive: boolean;
  articleCount: number;
  categories: Category[];
}

type FormState = Required<Omit<PersonaInput, "isActive">> & { isActive: boolean };

const EMPTY: FormState = { name: "", role: "Haber Editörü", image: "", description: "", prompt: "", imagePrompt: "", categoryIds: [], isActive: true };

/** Hızlı başlangıç şablonları; kategori adına göre eşleşen kategoriler otomatik seçilir. */
const TEMPLATES: { label: string; match: string[]; data: Omit<FormState, "categoryIds" | "isActive" | "image"> }[] = [
  {
    label: "Genel haber editörü",
    match: [],
    data: {
      name: "Deniz Arslan",
      role: "Haber Editörü",
      description: "Gündemi tarafsız, açık ve anlaşılır bir dille aktarır.",
      prompt: "Tarafsız ve nesnel yaz. Önce en önemli bilgiyi ver (ters piramit). Kısa paragraflar ve sade cümleler kullan. Tahmin ve yorumu haberden ayır; kaynakları belirt.",
      imagePrompt: "Gerçekçi haber fotoğrafı tarzı, doğal ışık, yazı veya logo yok.",
    },
  },
  {
    label: "Ekonomi muhabiri",
    match: ["ekonomi", "finans", "borsa"],
    data: {
      name: "Selin Kaya",
      role: "Ekonomi Muhabiri",
      description: "Rakamları okurun cebine etkisiyle birlikte anlatır.",
      prompt: "Ekonomi haberlerini sade bir dille yaz. Önemli rakamları (oran, tutar, değişim) net ver ve okur için ne anlama geldiğini bir cümleyle açıkla. Yatırım tavsiyesi verme.",
      imagePrompt: "Ekonomi temalı, sade ve profesyonel görsel; grafikler, şehir veya ilgili nesneler; yazı yok.",
    },
  },
  {
    label: "Spor yazarı",
    match: ["spor", "futbol"],
    data: {
      name: "Emre Yıldız",
      role: "Spor Yazarı",
      description: "Maçları ve transferleri canlı, enerjik bir dille aktarır.",
      prompt: "Enerjik ve akıcı yaz ama abartıdan kaçın. Skor, dakika ve oyuncu bilgilerini doğru ver. Taraftar diline kaçmadan, tüm takımlara eşit mesafede dur.",
      imagePrompt: "Dinamik spor fotoğrafı tarzı, stadyum atmosferi; gerçek oyuncu yüzü, logo veya yazı yok.",
    },
  },
  {
    label: "Teknoloji editörü",
    match: ["teknoloji", "bilim", "bilim-teknoloji"],
    data: {
      name: "Can Demir",
      role: "Teknoloji Editörü",
      description: "Yeni teknolojileri herkesin anlayacağı şekilde açıklar.",
      prompt: "Teknik terimleri ilk kullanımda kısaca açıkla. Ürün ve gelişmelerin günlük hayata etkisini vurgula. Reklam dili kullanma; artı ve eksileri dengeli ver.",
      imagePrompt: "Modern, temiz teknoloji görseli; soğuk tonlar, ürün veya devre detayları; marka logosu ve yazı yok.",
    },
  },
];

const inputClass = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

export function PersonaManager({ personas, categories }: { personas: PersonaView[]; categories: Category[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form açıkken arka plan kaymasın, Esc ile kapansın
  useEffect(() => {
    if (!form) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setForm(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [form]);

  const openNew = (template?: (typeof TEMPLATES)[number]) => {
    const categoryIds = template
      ? categories.filter((c) => template.match.some((m) => c.name.toLocaleLowerCase("tr").includes(m))).map((c) => c.id)
      : [];
    setForm({ ...EMPTY, ...(template?.data ?? {}), categoryIds });
    setEditingId(null);
    setError(null);
  };

  const openEdit = (p: PersonaView) => {
    setForm({
      name: p.name, role: p.role ?? "", image: p.image ?? "", description: p.description ?? "",
      prompt: p.prompt, imagePrompt: p.imagePrompt, categoryIds: p.categories.map((c) => c.id), isActive: p.isActive,
    });
    setEditingId(p.id);
    setError(null);
  };

  const save = () => {
    if (!form) return;
    setError(null);
    startSave(async () => {
      const res = editingId ? await updatePersona(editingId, form) : await createPersona(form);
      if (!res.success) { setError(res.error); return; }
      setForm(null);
      router.refresh();
    });
  };

  const toggleActive = async (p: PersonaView) => {
    setBusyId(p.id);
    const res = await setPersonaActive(p.id, !p.isActive);
    if (!res.success) toast.error(res.error);
    router.refresh();
    setBusyId(null);
  };

  const remove = async (p: PersonaView) => {
    const note = p.articleCount ? ` Yazdığı ${p.articleCount} haber silinmez; yazar olarak site hesabı görünür.` : "";
    if (!(await confirmDialog({ title: `"${p.name}" silinsin mi?`, message: note.trim() || "Bu işlem geri alınamaz.", confirmText: "Sil", tone: "danger" }))) return;
    setBusyId(p.id);
    const res = await deletePersona(p.id);
    if (!res.success) toast.error(res.error);
    router.refresh();
    setBusyId(null);
  };

  const toggleCategory = (id: string) =>
    setForm((f) => f && ({ ...f, categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((c) => c !== id) : [...f.categoryIds, id] }));

  const activeCount = personas.filter((p) => p.isActive).length;
  const coveredCategories = new Set(personas.filter((p) => p.isActive).flatMap((p) => p.categories.map((c) => c.id)));
  const hasGeneral = personas.some((p) => p.isActive && p.categories.length === 0);
  const uncovered = hasGeneral ? [] : categories.filter((c) => !coveredCategories.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-3">
            <span className="h-11 w-11 shrink-0 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-500" />
            </span>
            Yazar personaları
          </h1>
          <p className="text-sm text-muted-foreground">AI Yazar&apos;ın haberleri kimin ağzından, hangi üslupla yazacağını belirleyin.</p>
        </div>
        <button onClick={() => openNew()} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold shrink-0">
          <Plus className="h-4 w-4" /> Yeni persona
        </button>
      </div>

      {/* Nasıl çalışır */}
      <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-1.5">
        <p className="font-semibold flex items-center gap-2"><Info className="h-4 w-4 text-primary-500" /> Nasıl çalışır?</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1 text-[13px]">
          <li>AI Yazar haberi yazarken o haberin kategorisine atanmış personayı seçer; birden fazlaysa sırayla kullanır.</li>
          <li>Kategori seçilmeyen persona <strong className="text-foreground">genel</strong> sayılır ve personası olmayan tüm kategorilerde yazar.</li>
          <li>Haberde yazar olarak personanın adı, fotoğrafı ve unvanı görünür. Persona yoksa site hesabınız görünür.</li>
        </ul>
      </div>

      {personas.length > 0 && uncovered.length > 0 && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-xs">
          Personası olmayan kategoriler: <strong>{uncovered.map((c) => c.name).join(", ")}</strong>. Bunlar için bir persona atayın ya da kategorisiz bir genel persona ekleyin.
        </p>
      )}

      {/* Şablonlar */}
      {personas.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border p-5 space-y-4">
          <div className="text-center space-y-1">
            <Sparkles className="h-8 w-8 text-primary-500 mx-auto" />
            <p className="font-semibold">Henüz persona yok</p>
            <p className="text-sm text-muted-foreground">Hazır bir şablonla başlayın; her şeyi kaydetmeden önce değiştirebilirsiniz.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => openNew(t)} className="text-left rounded-xl border border-border bg-card p-3 hover:border-primary-500/50 transition-colors">
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.data.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {personas.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">{personas.length} persona · {activeCount} aktif</p>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {personas.map((p) => (
              <li key={p.id} className={cn("rounded-2xl border border-border bg-card p-4 shadow-card min-w-0 flex flex-col gap-3", !p.isActive && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-primary-500/10 flex items-center justify-center overflow-hidden">
                    {p.image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.image} alt="" className="h-full w-full object-cover" />
                      : <span className="text-lg font-bold text-primary-500">{p.name.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.role || "Haber Editörü"}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={p.isActive}
                    aria-label={p.isActive ? "Pasifleştir" : "Aktifleştir"}
                    disabled={busyId === p.id}
                    onClick={() => toggleActive(p)}
                    className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", p.isActive ? "bg-success" : "bg-muted-foreground/30")}
                  >
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", p.isActive ? "left-[22px]" : "left-0.5")} />
                  </button>
                </div>

                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}

                <div className="flex flex-wrap gap-1">
                  {p.categories.length > 0
                    ? p.categories.map((c) => <span key={c.id} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold">{c.name}</span>)
                    : <span className="rounded-md bg-primary-500/10 text-primary-500 px-2 py-0.5 text-[11px] font-semibold">Genel · tüm kategoriler</span>}
                </div>

                <div className="mt-auto flex items-center gap-2 pt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground flex-1">
                    <FileText className="h-3.5 w-3.5" /> {p.articleCount} haber
                  </span>
                  <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5" /> Düzenle
                  </button>
                  <button onClick={() => remove(p)} disabled={busyId === p.id} aria-label="Sil" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border text-error hover:bg-error/10 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setForm(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="persona-form-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <h2 id="persona-form-title" className="font-bold font-display">{editingId ? "Personayı düzenle" : "Yeni persona"}</h2>
              <button onClick={() => setForm(null)} aria-label="Kapat" className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-24 shrink-0">
                  <ImageUploader value={form.image} onChange={(url) => setForm({ ...form, image: url })} type="profile" aspectRatio="square" autoOptimize />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold">Ad soyad</span>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn. Deniz Arslan" className={inputClass} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold">Unvan</span>
                    <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Örn. Ekonomi Muhabiri" className={inputClass} />
                  </label>
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold">Kısa tanıtım <span className="font-normal text-muted-foreground">(haberin altındaki yazar kutusunda görünür)</span></span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={cn(inputClass, "resize-none")} />
              </label>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold">Kategoriler <span className="font-normal text-muted-foreground">(boş bırakırsanız genel persona olur)</span></span>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const on = form.categoryIds.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        aria-pressed={on}
                        onClick={() => toggleCategory(c.id)}
                        className={cn("h-8 px-3 rounded-full border text-xs font-semibold transition-colors", on ? "bg-primary-500 border-primary-500 text-white" : "border-border hover:border-primary-500/50")}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold">Yazım üslubu</span>
                <span className="block text-[11px] text-muted-foreground">Genel yazım talimatına eklenir. Tonu, dili ve nelere dikkat edileceğini anlatın.</span>
                <textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={5} placeholder="Örn. Sade ve tarafsız yaz; rakamları okurun hayatına etkisiyle açıkla…" className={inputClass} />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold">Kapak görseli tarzı <span className="font-normal text-muted-foreground">(isteğe bağlı)</span></span>
                <span className="block text-[11px] text-muted-foreground">Boş bırakılırsa Ayarlar&apos;daki genel görsel talimatı kullanılır.</span>
                <textarea value={form.imagePrompt} onChange={(e) => setForm({ ...form, imagePrompt: e.target.value })} rows={2} className={cn(inputClass, "resize-none")} />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 accent-primary-500" />
                Aktif (AI Yazar bu personayı kullanabilir)
              </label>

            </div>

            <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
              {error && <p role="alert" className="w-full text-sm text-error">{error}</p>}
              <button onClick={() => setForm(null)} className="h-10 px-4 rounded-xl text-sm font-semibold hover:bg-muted">Vazgeç</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Kaydet" : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
