"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle, AudioLines, BrainCircuit, CheckCircle2, ChevronDown, ImageIcon, KeyRound, Loader2,
  PenLine, PlayCircle, RotateCcw, Save, Search, X, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AI_TASKS, DEFAULT_MODELS, PROVIDER_LABELS, parseModelRef, type AiProvider, type AiTask,
} from "@/lib/ai/models";
import type { CatalogModel, ModelTestResult } from "@/lib/ai/client";
import { getModelCatalogAction, saveAiSettings, testModelAction, type AiTaskState } from "../ai-actions";

interface Props {
  providers: Record<AiProvider, boolean>;
  tasks: AiTaskState[];
  writerPrompt: string;
  imagePrompt: string;
  editorialCriteria: string;
  defaultEditorialCriteria: string;
  searchEnabled: boolean;
  useRssImage: boolean;
}

const TASK_ICONS: Record<AiTask, typeof PenLine> = {
  writer: PenLine,
  analyzer: BrainCircuit,
  image: ImageIcon,
  tts: AudioLines,
};

const TASK_ORDER: AiTask[] = ["writer", "analyzer", "image", "tts"];

function ModelChip({ value }: { value: string }) {
  const ref = parseModelRef(value);
  if (!ref) return <span className="text-sm text-muted-foreground">Seçilmedi</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
      <span className="font-mono text-sm text-foreground break-all">{ref.model}</span>
      <span className={cn(
        "shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
        ref.provider === "google" ? "bg-primary-500/10 text-primary-500" : "bg-accent-500/10 text-accent-500"
      )}>
        {ref.provider === "google" ? "Google" : "OpenRouter"}
      </span>
    </span>
  );
}

/* ───────────── Model seçici ───────────── */

function ModelPicker({
  task, value, providers, onSelect, onClose,
}: {
  task: AiTask; value: string; providers: Record<AiProvider, boolean>;
  onSelect: (ref: string) => void; onClose: () => void;
}) {
  const output = AI_TASKS[task].output;
  const allowed: AiProvider[] = task === "tts" ? ["google"] : ["google", "openrouter"];
  const [provider, setProvider] = useState<AiProvider>(parseModelRef(value)?.provider ?? allowed[0]);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Partial<Record<AiProvider, CatalogModel[]>>>({});
  const [errors, setErrors] = useState<Partial<Record<AiProvider, string>>>({});
  const [manual, setManual] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const error = errors[provider] ?? null;
  const isLoading = refreshing || (!catalog[provider] && !error);

  const fetchCatalog = async (p: AiProvider, refresh: boolean) => {
    const res = await getModelCatalogAction(p, refresh);
    if (res.success) {
      setCatalog((c) => ({ ...c, [p]: res.models }));
      setErrors((e) => ({ ...e, [p]: undefined }));
    } else {
      setErrors((e) => ({ ...e, [p]: res.error }));
    }
  };

  // Sağlayıcı sekmesi açıldığında listesini bir kez getir
  useEffect(() => {
    if (catalog[provider] || errors[provider]) return;
    let active = true;
    getModelCatalogAction(provider, false).then((res) => {
      if (!active) return;
      if (res.success) setCatalog((c) => ({ ...c, [provider]: res.models }));
      else setErrors((e) => ({ ...e, [provider]: res.error }));
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchCatalog(provider, true);
    setRefreshing(false);
  };

  const recommended = DEFAULT_MODELS[task][provider];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (catalog[provider] ?? [])
      .filter((m) => m.outputs.includes(output))
      .filter((m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      .slice(0, 150);
  }, [catalog, provider, query, output]);

  return (
    <div className="fixed inset-0 z-(--z-modal) flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Model seç">
      <div className="w-full sm:max-w-lg max-h-[85vh] flex flex-col bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
          <div>
            <h3 className="font-bold font-display">{AI_TASKS[task].label} modeli</h3>
            <p className="text-xs text-muted-foreground">Yalnızca bu görevi yapabilen modeller listelenir.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted cursor-pointer" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-border">
          {allowed.length > 1 && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted">
              {allowed.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={cn(
                    "h-9 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                    provider === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {PROVIDER_LABELS[p]} {!providers[p] && <span className="text-[10px] text-error">· anahtar yok</span>}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Model ara (ör. gemini, claude, gpt)"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {recommended && (
            <button
              type="button"
              onClick={() => onSelect(`${provider}:${recommended}`)}
              className="w-full text-left p-3 mb-1 rounded-xl border border-primary-500/30 bg-primary-500/5 hover:bg-primary-500/10 cursor-pointer"
            >
              <p className="text-xs font-bold text-primary-500 uppercase tracking-wide">Önerilen</p>
              <p className="font-mono text-sm">{recommended}</p>
            </button>
          )}
          {!isLoading && list.some((m) => m.price) && (
            <p className="px-3 pt-2 pb-1 text-[11px] text-muted-foreground">Fiyat: 1 milyon token başına giriş / çıkış (USD)</p>
          )}
          {isLoading && (
            <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Güncel model listesi alınıyor…</p>
          )}
          {error && <p className="p-3 text-sm text-error break-words">{error}</p>}
          {!isLoading && !error && list.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Eşleşen model yok.</p>
          )}
          {list.map((m) => {
            const selected = value === m.ref;
            return (
              <button
                key={m.ref}
                type="button"
                onClick={() => onSelect(m.ref)}
                className={cn(
                  "w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer",
                  selected ? "bg-primary-500/10" : "hover:bg-muted"
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{m.name}</span>
                  <span className="block font-mono text-xs text-muted-foreground truncate">{m.id}</span>
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground text-right">
                  {m.free ? <span className="text-success font-bold">Ücretsiz</span> : m.price ? `$${m.price.input} / $${m.price.output}` : ""}
                  {selected && <CheckCircle2 className="inline h-4 w-4 ml-1 text-primary-500" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-border flex flex-col sm:flex-row gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={`Elle model kimliği (ör. ${provider === "google" ? "gemini-3.8-flash" : "anthropic/claude-sonnet-5.5"})`}
            className="flex-1 h-10 px-3 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
          <button
            type="button"
            disabled={!manual.trim()}
            onClick={() => onSelect(`${provider}:${manual.trim()}`)}
            className="h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold disabled:opacity-50 cursor-pointer"
          >
            Kullan
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="h-10 px-3 rounded-xl text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            title="Listeyi yenile"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Ana panel ───────────── */

export function AiSettingsPanel(props: Props) {
  const initialModels = Object.fromEntries(
    props.tasks.map((t) => [t.task, t.retired || !t.stored ? t.effective ?? t.stored : t.stored])
  ) as Record<AiTask, string>;

  const [models, setModels] = useState(initialModels);
  const [writerPrompt, setWriterPrompt] = useState(props.writerPrompt);
  const [imagePrompt, setImagePrompt] = useState(props.imagePrompt);
  const [criteria, setCriteria] = useState(props.editorialCriteria);
  const [searchEnabled, setSearchEnabled] = useState(props.searchEnabled);
  const [useRssImage, setUseRssImage] = useState(props.useRssImage);
  const [picker, setPicker] = useState<AiTask | null>(null);
  const [tests, setTests] = useState<Partial<Record<AiTask, ModelTestResult | "loading">>>({});
  const [saveState, setSaveState] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSaving, startSave] = useTransition();
  const [showPrompts, setShowPrompts] = useState(false);

  const anyRetired = props.tasks.some((t) => t.retired);
  const dirty =
    TASK_ORDER.some((t) => models[t] !== (props.tasks.find((x) => x.task === t)?.stored ?? "")) ||
    writerPrompt !== props.writerPrompt || imagePrompt !== props.imagePrompt || criteria !== props.editorialCriteria ||
    searchEnabled !== props.searchEnabled || useRssImage !== props.useRssImage;

  const runTest = async (task: AiTask) => {
    setTests((t) => ({ ...t, [task]: "loading" }));
    const res = await testModelAction(task, models[task]);
    setTests((t) => ({ ...t, [task]: res as ModelTestResult }));
  };

  const save = () => {
    setSaveState(null);
    startSave(async () => {
      const res = await saveAiSettings({
        models,
        writerPrompt,
        imagePrompt,
        editorialCriteria: criteria,
        searchEnabled,
        useRssImage,
      });
      setSaveState(res.success ? { ok: true, message: "Ayarlar kaydedildi." } : { ok: false, message: res.error });
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Sağlayıcılar */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary-500" />
          <h2 className="font-bold font-display">Sağlayıcılar</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => (
            <div key={p} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm">
              {props.providers[p] ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
              <span className="font-medium">{PROVIDER_LABELS[p]}</span>
              <span className="ml-auto text-xs text-muted-foreground">{props.providers[p] ? "Anahtar tanımlı" : "Anahtar yok"}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Anahtarlar Vercel ortam değişkenlerinden okunur (GEMINI_API_KEY, OPENROUTER_API_KEY). Bir sağlayıcı hata verirse sistem
          aynı modeli otomatik olarak diğer sağlayıcı üzerinden dener.
        </p>
      </section>

      {anyRetired && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Kullanımdan kalkmış modeller güncellendi.</span>{" "}
            Kayıtlı bazı modeller sağlayıcı tarafından kaldırılmış; yerlerine güncel öneriler seçildi. Kalıcı olması için kaydedin.
          </p>
        </div>
      )}

      {/* Görev modelleri */}
      <section className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border">
        <div className="p-4 sm:p-6">
          <h2 className="font-bold font-display">Modeller</h2>
          <p className="text-xs text-muted-foreground">Her iş için kullanılacak modeli seçin ve tek tıkla test edin.</p>
        </div>
        {TASK_ORDER.map((task) => {
          const Icon = TASK_ICONS[task];
          const original = props.tasks.find((t) => t.task === task);
          const test = tests[task];
          return (
            <div key={task} className="p-4 sm:px-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{AI_TASKS[task].label}</p>
                  <p className="text-xs text-muted-foreground">{AI_TASKS[task].description}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:pl-12">
                <div className="flex-1 min-w-0 rounded-xl bg-muted/50 border border-border px-3 py-2 overflow-hidden">
                  <ModelChip value={models[task]} />
                  {original?.retired && models[task] === original.effective && (
                    <p className="text-[11px] text-warning mt-0.5 truncate">Eski: {original.stored}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPicker(task)}
                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    Değiştir <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => runTest(task)}
                    disabled={test === "loading"}
                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold hover:bg-muted/70 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    {test === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} Test et
                  </button>
                </div>
              </div>
              {test && test !== "loading" && (
                <div className={cn(
                  "sm:ml-12 rounded-xl border px-3 py-2 text-sm",
                  test.ok ? "border-success/30 bg-success/10" : "border-error/30 bg-error/10"
                )} aria-live="polite">
                  <p className={cn("flex items-center gap-2 font-medium", test.ok ? "text-success" : "text-error")}>
                    {test.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {test.ok ? "Çalışıyor" : "Çalışmıyor"} <span className="text-xs text-muted-foreground font-normal">· {(test.ms / 1000).toFixed(1)} sn</span>
                  </p>
                  <p className="text-xs text-foreground mt-0.5">{test.detail}</p>
                  {test.raw && (
                    <details className="mt-1">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Sağlayıcının hata mesajı</summary>
                      <p className="mt-1 text-xs font-mono break-words text-muted-foreground">{test.raw}</p>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Talimatlar */}
      <section className="rounded-2xl border border-border bg-card shadow-card">
        <button
          type="button"
          onClick={() => setShowPrompts((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-4 sm:p-6 text-left cursor-pointer"
          aria-expanded={showPrompts}
        >
          <span>
            <span className="block font-bold font-display">Yazım ve analiz talimatları</span>
            <span className="block text-xs text-muted-foreground">Yapay zekâya verilen talimatlar ve seçenekler</span>
          </span>
          <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", showPrompts && "rotate-180")} />
        </button>

        {showPrompts && (
          <div className="px-4 pb-5 sm:px-6 space-y-5">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Haber yazım talimatı</span>
              <span className="block text-xs text-muted-foreground">Yazarın üslubu, tonu ve kuralları. Personalar bunun üzerine kendi talimatlarını ekler.</span>
              <textarea value={writerPrompt} onChange={(e) => setWriterPrompt(e.target.value)} rows={6}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Editoryal seçim kriterleri</span>
              <span className="block text-xs text-muted-foreground">RSS haberleri puanlanırken hangi haberlerin öne çıkacağı. Boş bırakılırsa varsayılan kullanılır.</span>
              <textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={5} placeholder={props.defaultEditorialCriteria}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
              {!criteria && (
                <button type="button" onClick={() => setCriteria(props.defaultEditorialCriteria)} className="text-xs text-primary-500 font-semibold cursor-pointer">
                  Varsayılanı düzenlemek için doldur
                </button>
              )}
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Kapak görseli talimatı</span>
              <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
            </label>

            <div className="space-y-2">
              {[
                { label: "Yazarken web/Google araması yap", help: "Daha güncel ve doğru bilgi; biraz daha yavaş ve maliyetli.", value: searchEnabled, set: setSearchEnabled },
                { label: "RSS görselini görsel üretiminde referans al", help: "Kapak görseli kaynak haberin görseline benzer üretilir.", value: useRssImage, set: setUseRssImage },
              ].map((o) => (
                <label key={o.label} className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
                  <input type="checkbox" checked={o.value} onChange={(e) => o.set(e.target.checked)} className="mt-1 h-4 w-4 accent-primary-500" />
                  <span>
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.help}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Kaydet çubuğu */}
      <div className="fixed bottom-0 inset-x-0 md:sticky md:bottom-4 z-(--z-sticky) p-3 md:p-0 bg-background/95 md:bg-transparent border-t border-border md:border-0">
        <div className="flex items-center gap-3 md:rounded-2xl md:border md:border-border md:bg-card md:shadow-card md:p-3">
          <p className={cn("flex-1 text-sm", saveState ? (saveState.ok ? "text-success" : "text-error") : "text-muted-foreground")} aria-live="polite">
            {saveState?.message ?? (dirty ? "Kaydedilmemiş değişiklikler var." : "Tüm değişiklikler kayıtlı.")}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={isSaving || (!dirty && !anyRetired)}
            className="h-11 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
          </button>
        </div>
      </div>

      {picker && (
        <ModelPicker
          task={picker}
          value={models[picker]}
          providers={props.providers}
          onClose={() => setPicker(null)}
          onSelect={(ref) => {
            setModels((m) => ({ ...m, [picker]: ref }));
            setTests((t) => ({ ...t, [picker]: undefined }));
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
