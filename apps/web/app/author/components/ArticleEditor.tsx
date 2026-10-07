"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react";
import { LiveSeoPanel } from "./LiveSeoPanel";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ExternalLink, FileText, Image as ImageIcon, Info, Loader2, Newspaper, RefreshCw, RotateCcw, Save, Send, Tag, Undo2, X } from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { cn } from "@/lib/utils";
import { saveArticle } from "../actions";

const TiptapEditor = dynamic(() => import("./TiptapEditor").then((m) => m.TiptapEditor), {
  ssr: false,
  loading: () => <div className="h-96 rounded-2xl border border-border bg-muted/40 animate-pulse" />,
});

export interface EditorArticle {
  id: string | null;
  slug: string | null;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: string;
  status: "DRAFT" | "PUBLISHED";
  tags: string[];
  /** Sunucudaki son güncellenme zamanı (eşzamanlı düzenleme kontrolü) */
  updatedAt: string | null;
}

export interface EditorSuggestion {
  id: string;
  title: string;
  summary: string;
  categoryName: string | null;
  sources: { title: string; url: string; source: string }[];
}

type Fields = Pick<EditorArticle, "title" | "excerpt" | "content" | "coverImage" | "categoryId" | "tags">;

const LOCAL_KEY = (suggestionId?: string) => `hn:author-draft:${suggestionId ?? "new"}`;
const TITLE_MAX = 200;
const EXCERPT_MAX = 300;
const TAGS_MAX = 6;

function textStats(html: string) {
  const words = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.round(words / 200)) };
}

export function ArticleEditor({ article, categories, suggestion, initialNotice }: {
  article: EditorArticle;
  categories: { id: string; name: string }[];
  suggestion?: EditorSuggestion | null;
  /** Yeni haber kaydedilip bu sayfaya yönlendirildiyse gösterilecek mesaj */
  initialNotice?: string | null;
}) {
  const router = useRouter();
  const isNew = !article.id;
  const initial = useMemo<Fields>(() => {
    const base: Fields = { title: article.title, excerpt: article.excerpt, content: article.content, coverImage: article.coverImage, categoryId: article.categoryId, tags: article.tags };
    if (!isNew || !suggestion) return base;
    const cat = categories.find((c) => c.name.toLocaleLowerCase("tr") === suggestion.categoryName?.toLocaleLowerCase("tr"));
    return { ...base, title: suggestion.title, excerpt: suggestion.summary.slice(0, EXCERPT_MAX), categoryId: cat?.id ?? "" };
  }, [article, categories, isNew, suggestion]);

  const [fields, setFields] = useState<Fields>(initial);
  const [saved, setSaved] = useState<Fields>(initial);
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [pending, start] = useTransition();
  const [restorable, setRestorable] = useState<Fields | null>(null);
  const [conflict, setConflict] = useState(false);
  const [tagInput, setTagInput] = useState("");
  // Kaydedilen her sürümün sunucu zamanı; bir sonraki kayıt buna göre çakışma denetler
  const versionRef = useRef<string | null>(article.updatedAt);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);
  const stats = textStats(fields.content);
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setFields((f) => ({ ...f, [k]: v }));

  // Yeni haberlerde kaydedilmemiş yerel taslağı teklif et
  useEffect(() => {
    if (!isNew) return;
    try {
      const raw = localStorage.getItem(LOCAL_KEY(suggestion?.id));
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<Fields>;
      if (draft && (draft.title || draft.content)) queueMicrotask(() => setRestorable({ ...initial, ...draft, tags: Array.isArray(draft.tags) ? draft.tags : [] }));
    } catch { /* depolama kapalı */ }
  }, [isNew, suggestion?.id, initial]);

  // Yeni haberlerde yazılanları cihazda sakla (sayfa kapanırsa kaybolmasın)
  useEffect(() => {
    if (!isNew || !dirty) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(LOCAL_KEY(suggestion?.id), JSON.stringify(fields)); } catch { /* yok say */ }
    }, 800);
    return () => clearTimeout(t);
  }, [fields, dirty, isNew, suggestion?.id]);

  // Kaydedilmemiş değişiklikle sayfadan çıkarken uyar
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Başlık alanı içeriğe göre uzasın
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [fields.title]);

  const restore = () => {
    if (!restorable) return;
    setFields(restorable);
    setEditorKey((k) => k + 1);
    setRestorable(null);
  };
  const discardLocal = () => {
    try { localStorage.removeItem(LOCAL_KEY(suggestion?.id)); } catch { /* yok say */ }
    setRestorable(null);
  };

  const addTags = (raw: string) => {
    const parts = raw.split(/[,\n]/).map((t) => t.trim().replace(/^#+/, "")).filter((t) => t.length >= 2 && t.length <= 40);
    if (!parts.length) return;
    setFields((f) => {
      const seen = new Set(f.tags.map((t) => t.toLocaleLowerCase("tr")));
      const next = [...f.tags];
      for (const p of parts) {
        if (next.length >= TAGS_MAX || seen.has(p.toLocaleLowerCase("tr"))) continue;
        seen.add(p.toLocaleLowerCase("tr"));
        next.push(p);
      }
      return { ...f, tags: next };
    });
    setTagInput("");
  };

  const save = (status: "DRAFT" | "PUBLISHED") => {
    if (pending) return;
    if (status === "DRAFT" && article.status === "PUBLISHED" && !confirm("Haber yayından kaldırılıp taslağa alınsın mı?")) return;
    setError(null);
    setNotice(null);
    // Yazılıp eklenmemiş etiket de kaydedilsin
    const pendingTags = tagInput.trim() ? [...fields.tags, ...tagInput.split(",").map((t) => t.trim()).filter(Boolean)].slice(0, TAGS_MAX) : fields.tags;
    const toSave = { ...fields, tags: pendingTags };
    start(async () => {
      const r = await saveArticle(article.id, { ...toSave, status, storyId: suggestion?.id, expectedUpdatedAt: versionRef.current ?? undefined });
      if (!r.success) {
        setError(r.error);
        setConflict(!!r.conflict);
        return;
      }
      versionRef.current = r.updatedAt;
      setTagInput("");
      const savedFields = { ...toSave, tags: r.tags };
      setFields(savedFields);
      setSaved(savedFields);
      try { localStorage.removeItem(LOCAL_KEY(suggestion?.id)); } catch { /* yok say */ }
      if (isNew) {
        // Sonraki kayıtlar yeni haber açmasın diye düzenleme sayfasına geç
        router.replace(`/author/articles/${r.id}/edit?kaydedildi=${r.status === "PUBLISHED" ? "yayin" : "taslak"}`);
        return;
      }
      setNotice(r.status === "PUBLISHED" ? (article.status === "PUBLISHED" ? "Değişiklikler yayında." : "Haber yayınlandı.") : "Taslak kaydedildi.");
      router.refresh();
    });
  };

  const published = article.status === "PUBLISHED";
  const titleLen = fields.title.trim().length;

  // Ctrl/Cmd+S: yayındaki haberi günceller, taslağı kaydeder (tarayıcının "sayfayı kaydet"i açılmaz)
  const onSaveShortcut = useEffectEvent(() => save(published ? "PUBLISHED" : "DRAFT"));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSaveShortcut();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-5 pb-28">
      {restorable && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-500/30 bg-primary-500/10 px-3.5 py-2.5 text-sm">
          <RotateCcw className="h-4 w-4 text-primary-500 shrink-0" />
          <span className="flex-1 min-w-0">Bu cihazda kaydedilmemiş bir taslağın var.</span>
          <button type="button" onClick={restore} className="h-8 px-3 rounded-lg bg-primary-500 text-white text-xs font-semibold">Geri yükle</button>
          <button type="button" onClick={discardLocal} className="h-8 px-3 rounded-lg text-xs font-semibold hover:bg-muted">Yok say</button>
        </div>
      )}

      {suggestion && (
        <details className="rounded-2xl border border-border bg-card p-4 shadow-card" open>
          <summary className="cursor-pointer text-sm font-semibold flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary-500" /> Öneri kaynakları ({suggestion.sources.length})
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">Kaynakları okuyup haberi kendi cümlelerinle yaz; metinleri kopyalama. Yayınladığında bu konu AI Yazar sırasından çıkar.</p>
          <ul className="mt-2 space-y-1.5">
            {suggestion.sources.map((s) => (
              <li key={s.url} className="text-xs min-w-0">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 hover:text-primary-500">
                  <ExternalLink className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                  <span className="min-w-0"><strong>{s.source}:</strong> {s.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-5">
        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-card space-y-3">
            <label htmlFor="article-title" className="sr-only">Başlık</label>
            <textarea
              id="article-title"
              ref={titleRef}
              rows={1}
              value={fields.title}
              onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))}
              placeholder="Haber başlığı"
              maxLength={TITLE_MAX}
              className="w-full resize-none overflow-hidden bg-transparent text-xl sm:text-2xl font-bold font-display leading-snug outline-none placeholder:text-muted-foreground/50"
            />
            <p className={cn("text-[11px]", titleLen > 90 ? "text-warning" : "text-muted-foreground")}>
              {titleLen}/{TITLE_MAX} {titleLen > 90 ? "· Arama sonuçlarında kısalabilir; 60-90 karakter ideal" : ""}
            </p>
            <label htmlFor="article-excerpt" className="sr-only">Özet</label>
            <textarea
              id="article-excerpt"
              rows={2}
              value={fields.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              placeholder="Kısa özet (spot) — haber kartlarında ve arama sonuçlarında görünür"
              maxLength={EXCERPT_MAX}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary-500"
            />
            <p className="text-right text-[11px] text-muted-foreground">{fields.excerpt.length}/{EXCERPT_MAX}</p>
          </div>

          <TiptapEditor key={editorKey} content={fields.content} onChange={(html) => set("content", html)} />
        </div>

        <aside className="space-y-4 min-w-0">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-2">
            <label htmlFor="article-category" className="text-sm font-semibold">Kategori</label>
            <select
              id="article-category"
              value={fields.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary-500"
            >
              <option value="">Kategori seçin</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-2">
            <label htmlFor="article-tags" className="text-sm font-semibold flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Etiketler</label>
            {fields.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Eklenen etiketler">
                {fields.tags.map((t) => (
                  <li key={t} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-muted text-xs font-medium">
                    {t}
                    <button type="button" onClick={() => set("tags", fields.tags.filter((x) => x !== t))} aria-label={`${t} etiketini kaldır`} className="h-5 w-5 inline-flex items-center justify-center rounded-full hover:bg-background cursor-pointer">
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {fields.tags.length < TAGS_MAX && (
              <input
                id="article-tags"
                value={tagInput}
                onChange={(e) => (e.target.value.includes(",") ? addTags(e.target.value) : setTagInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTags(tagInput); }
                  else if (e.key === "Backspace" && !tagInput && fields.tags.length) set("tags", fields.tags.slice(0, -1));
                }}
                onBlur={() => addTags(tagInput)}
                placeholder="Kişi, kurum, yer… (Enter ile ekle)"
                maxLength={40}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary-500"
              />
            )}
            <p className="text-[11px] text-muted-foreground">3-6 etiket önerilir. Etiket sayfaları haberinizin aramalarda bulunmasına yardım eder.</p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4 text-muted-foreground" /> Kapak görseli</h3>
            <ImageUploader value={fields.coverImage} onChange={(url) => set("coverImage", url)} type="article" aspectRatio="video" />
            <p className="text-[11px] text-muted-foreground">Önerilen: 1200×675 (16:9)</p>
          </section>

          <LiveSeoPanel title={fields.title} excerpt={fields.excerpt} content={fields.content} coverImage={fields.coverImage} tags={fields.tags} />

          <section className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-1.5 text-sm">
            <h3 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /> Durum</h3>
            <p className="flex justify-between"><span className="text-muted-foreground">Yayın</span><span className={cn("font-semibold", published ? "text-success" : "text-warning")}>{published ? "Yayında" : isNew ? "Yeni" : "Taslak"}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Kelime</span><span className="font-semibold tabular-nums">{stats.words}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Okuma süresi</span><span className="font-semibold">~{stats.minutes} dk</span></p>
            {published && article.slug && (
              <Link href={`/article/${article.slug}`} target="_blank" className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-primary-500">
                Sitede gör <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </section>
        </aside>
      </div>

      {/* Kaydetme çubuğu: her ekranda altta sabit */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-2">
          <p className="flex-1 min-w-[10rem] text-xs" role="status">
            {error ? (
              <span className="flex items-start gap-1.5 text-error"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</span>
            ) : notice ? (
              <span className="flex items-center gap-1.5 text-success"><CheckCircle2 className="h-4 w-4 shrink-0" /> {notice}</span>
            ) : dirty ? (
              <span className="text-warning font-semibold">Kaydedilmemiş değişiklikler var</span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {isNew ? "Yeni haber" : "Tüm değişiklikler kaydedildi"}</span>
            )}
          </p>
          {conflict && (
            <button type="button" onClick={() => window.open(window.location.href, "_blank")} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Güncel hâlini yeni sekmede aç
            </button>
          )}
          {error && <button type="button" onClick={() => { setError(null); setConflict(false); }} aria-label="Uyarıyı kapat" className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-muted cursor-pointer"><X className="h-4 w-4" /></button>}
          {published ? (
            <>
              <button type="button" disabled={pending} onClick={() => save("DRAFT")} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50">
                <Undo2 className="h-4 w-4" /> <span className="hidden sm:inline">Yayından kaldır</span><span className="sm:hidden">Kaldır</span>
              </button>
              <button type="button" disabled={pending || !dirty} onClick={() => save("PUBLISHED")} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-50">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Güncelle
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={pending} onClick={() => save("DRAFT")} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50">
                <Save className="h-4 w-4" /> <span className="hidden sm:inline">Taslak kaydet</span><span className="sm:hidden">Taslak</span>
              </button>
              <button type="button" disabled={pending} onClick={() => save("PUBLISHED")} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-50">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Yayınla
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
