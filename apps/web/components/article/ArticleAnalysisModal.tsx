"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle, AlertTriangle, BookOpen, CheckCircle2, CircleAlert, ExternalLink, FileSearch, ListChecks, PenLine,
  RefreshCw, Search, Sparkles, TrendingUp, Wand2, X, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeArticleAction as adminAnalyze, fixCopiedPassagesAction as adminFix, rewriteArticleWithAIAction as adminRewrite } from "@/app/admin/actions";
import { analyzeArticleAction as authorAnalyze, fixCopiedPassagesAction as authorFix, rewriteArticleWithAIAction as authorRewrite } from "@/app/author/actions";

/* ── Rapor (sürüm 2) ─────────────────────────────────── */

type CheckStatus = "pass" | "warn" | "fail";
interface ReportV2 {
  version: 2;
  analyzedAt?: string;
  overall?: number;
  quality?: { score: number | null; ai: boolean; comment: string | null; strengths: string[]; issues: string[] };
  seo?: { score: number; focusKeyword: string | null; titleSuggestion?: string | null; descriptionSuggestion?: string | null; checks: { id: string; label: string; status: CheckStatus; detail: string }[] };
  readability?: {
    score: number;
    level: string;
    stats: { words: number; sentences: number; paragraphs: number; avgSentenceWords: number; longSentences: number; longParagraphs: number; readingMinutes: number; atesman: number; h2: number; h3: number };
  };
  originality?: {
    score: number;
    copiedRate: number;
    sourcesChecked: number;
    fullTextChecked: number;
    siteArticlesChecked: number;
    web?: { enabled: boolean; queries: number; candidates: number; verified: number; error?: string };
    matches: { title: string; url: string | null; kind: "source" | "web" | "site"; percent: number }[];
    passages?: { text: string; source: string; url: string | null; percent: number }[];
  };
  fixes?: string[];
  suggestions?: string[];
}

interface Scores {
  plagiarismRate: number | null;
  seoScore: number | null;
  readabilityScore: number | null;
  qualityScore: number | null;
  analysisReport: unknown;
}

interface ArticleAnalysisModalProps {
  articleId: string;
  articleTitle: string;
  userRole: "ADMIN" | "AUTHOR";
  initialData?: Scores;
  onClose: () => void;
  onAnalysisComplete?: (updatedArticle: unknown) => void;
}

const asV2 = (r: unknown): ReportV2 | null =>
  r && typeof r === "object" && !Array.isArray(r) && (r as { version?: unknown }).version === 2 ? (r as ReportV2) : null;

const tone = (v: number) => (v >= 80 ? "text-success" : v >= 60 ? "text-warning" : "text-error");
const barTone = (v: number) => (v >= 80 ? "bg-success" : v >= 60 ? "bg-warning" : "bg-error");
const KIND_LABEL = { source: "Haberin kaynağı", web: "İnternette bulunan sayfa", site: "Sitedeki başka bir haber" } as const;
const verdict = (v: number) => (v >= 85 ? "Çok iyi" : v >= 70 ? "İyi" : v >= 55 ? "Geliştirilmeli" : "Zayıf");

function Ring({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} strokeWidth="7" className="stroke-muted" fill="none" />
        <circle cx="40" cy="40" r={r} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (value / 100) * c}
          className={cn("transition-all duration-700", value >= 80 ? "stroke-success" : value >= 60 ? "stroke-warning" : "stroke-error")} />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-2xl font-extrabold tabular-nums", tone(value))}>{value}</span>
    </div>
  );
}

function ScoreBar({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold">{label}</span>
        <span className={cn("font-bold tabular-nums", value === null ? "text-muted-foreground" : tone(value))}>{value ?? "—"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        {value !== null && <div className={cn("h-full rounded-full", barTone(value))} style={{ width: `${value}%` }} />}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const STATUS_ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-success shrink-0" />,
  warn: <CircleAlert className="h-4 w-4 text-warning shrink-0" />,
  fail: <XCircle className="h-4 w-4 text-error shrink-0" />,
};

type Tab = "todo" | "seo" | "readability" | "originality" | "editor";
const TABS: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: "todo", label: "Yapılacaklar", icon: ListChecks },
  { id: "seo", label: "SEO", icon: TrendingUp },
  { id: "readability", label: "Okunabilirlik", icon: BookOpen },
  { id: "originality", label: "Özgünlük", icon: FileSearch },
  { id: "editor", label: "Editör", icon: PenLine },
];

/**
 * Haber analizi: genel puan, ölçülen SEO kontrolleri, Türkçe okunabilirlik, kaynaklarla gerçek metin
 * karşılaştırması ve yapay zekâ editör değerlendirmesi.
 */
export function ArticleAnalysisModal({ articleId, articleTitle, userRole, initialData, onClose, onAnalysisComplete }: ArticleAnalysisModalProps) {
  const [tab, setTab] = useState<Tab>("todo");
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"analyze" | "rewrite" | "fix" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<Scores | null>(initialData ?? null);
  const report = asV2(data?.analysisReport);
  const hasOld = !report && data?.qualityScore != null;

  const run = (kind: "analyze" | "rewrite" | "fix") => {
    if (kind === "fix" && !confirm("Kaynaklardan aynen alınmış cümlelerin geçtiği paragraflar, bilgiler korunarak yapay zekâ ile yeniden yazılacak ve haber tekrar analiz edilecek. Devam edilsin mi?")) return;
    if (kind === "rewrite" && !confirm("Haber metni yapay zekâ ile, analizdeki eksikler giderilecek şekilde yeniden yazılacak. Mevcut metin değişecek. Devam edilsin mi?")) return;
    setError(null);
    setNotice(null);
    setAction(kind);
    startTransition(async () => {
      try {
        if (kind === "analyze") {
          const res = userRole === "ADMIN" ? await adminAnalyze(articleId) : await authorAnalyze(articleId);
          if (res.success && "analysisReport" in res) {
            setData({ plagiarismRate: res.plagiarismRate, seoScore: res.seoScore, readabilityScore: res.readabilityScore, qualityScore: res.qualityScore, analysisReport: res.analysisReport });
            setTab("todo");
            onAnalysisComplete?.(res.article);
          } else setError(("error" in res && res.error) || "Analiz tamamlanamadı.");
        } else if (kind === "fix") {
          const res = userRole === "ADMIN" ? await adminFix(articleId) : await authorFix(articleId);
          if (res.success) {
            const a = res.analysis;
            if (a.success) {
              setData({ plagiarismRate: a.plagiarismRate, seoScore: a.seoScore, readabilityScore: a.readabilityScore, qualityScore: a.qualityScore, analysisReport: a.analysisReport });
              onAnalysisComplete?.(a.article);
            }
            setNotice(`${res.rewritten} paragraf yeniden yazıldı. Kaynaklarla aynen örtüşme: %${res.before} → ${res.after === null ? "ölçülemedi" : `%${res.after}`}.`);
          } else setError(res.error || "Düzeltme yapılamadı.");
        } else {
          const res = userRole === "ADMIN" ? await adminRewrite(articleId) : await authorRewrite(articleId);
          const a = res.success && "analysis" in res ? res.analysis : null;
          if (a && a.success) {
            setData({ plagiarismRate: a.plagiarismRate, seoScore: a.seoScore, readabilityScore: a.readabilityScore, qualityScore: a.qualityScore, analysisReport: a.analysisReport });
            setTab("todo");
            onAnalysisComplete?.(a.article);
          } else setError(("error" in res && res.error) || "Yeniden yazım tamamlanamadı.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sunucuya ulaşılamadı.");
      } finally {
        setAction(null);
      }
    });
  };

  const busy = (kind: "analyze" | "rewrite" | "fix") => isPending && action === kind;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="analysis-title">
      <div className="bg-background border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Başlık */}
        <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center gap-3">
          <span className="h-10 w-10 shrink-0 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500"><Sparkles className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="analysis-title" className="text-base sm:text-lg font-bold font-display">Haber Analizi</h2>
            <p className="text-xs text-muted-foreground truncate">{articleTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Kapat" className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"><X className="h-5 w-5" /></button>
        </div>

        {error && (
          <div className="px-4 sm:px-6 py-2.5 bg-error/10 border-b border-error/20 text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {notice && (
          <div className="px-4 sm:px-6 py-2.5 bg-success/10 border-b border-success/20 text-xs font-semibold flex items-center gap-2" aria-live="polite">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> {notice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!report ? (
            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
              <span className="h-14 w-14 bg-muted/50 rounded-full flex items-center justify-center mx-auto text-muted-foreground"><Search className="h-7 w-7" /></span>
              <div className="space-y-1.5">
                <h3 className="font-bold">{hasOld ? "Bu analiz eski yöntemle yapılmış" : "Henüz analiz yok"}</h3>
                <p className="text-sm text-muted-foreground">
                  Analiz; SEO kontrollerini ve Türkçe okunabilirliği ölçer, metni kaynak haberlerle ve internette bulunan sayfalarla
                  karşılaştırarak gerçek kopya oranını çıkarır; yapay zekâ editörü de kaliteyi değerlendirip somut öneriler verir.
                </p>
              </div>
              <button onClick={() => run("analyze")} disabled={isPending} className="w-full h-11 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                {busy("analyze") ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy("analyze") ? "Analiz ediliyor… (30-60 sn)" : hasOld ? "Yeniden analiz et" : "Şimdi analiz et"}
              </button>
            </div>
          ) : (
            <>
              {/* Özet */}
              <section className="grid gap-4 sm:grid-cols-[auto_1fr] items-center rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-4">
                  <Ring value={report.overall ?? 0} />
                  <div className="sm:hidden">
                    <p className={cn("text-lg font-bold", tone(report.overall ?? 0))}>{verdict(report.overall ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Genel puan</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="hidden sm:block text-sm">
                    <span className={cn("font-bold", tone(report.overall ?? 0))}>{verdict(report.overall ?? 0)}</span>
                    <span className="text-muted-foreground"> · Genel puan
                      {report.analyzedAt && ` · ${new Date(report.analyzedAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}`}
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ScoreBar label="Editoryal kalite" value={report.quality?.score ?? null} hint={report.quality?.ai ? undefined : "Yapay zekâ değerlendirmesi alınamadı"} />
                    <ScoreBar label="SEO" value={report.seo?.score ?? null} />
                    <ScoreBar label="Okunabilirlik" value={report.readability?.score ?? null} />
                    <ScoreBar label="Özgünlük" value={report.originality?.score ?? null} />
                  </div>
                </div>
              </section>

              {/* Sekmeler */}
              <nav className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar" aria-label="Analiz bölümleri">
                <ul className="flex gap-1.5 w-max">
                  {TABS.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => setTab(t.id)}
                        aria-current={tab === t.id ? "page" : undefined}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-semibold whitespace-nowrap cursor-pointer",
                          tab === t.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted",
                        )}
                      >
                        <t.icon className="h-3.5 w-3.5" /> {t.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="min-h-[200px]">
                {tab === "todo" && (
                  <div className="space-y-4">
                    {(report.fixes?.length ?? 0) === 0 && (report.suggestions?.length ?? 0) === 0 ? (
                      <p className="flex items-center gap-2 text-sm rounded-xl bg-success/10 p-3"><CheckCircle2 className="h-4 w-4 text-success" /> Ölçülen bir eksik yok.</p>
                    ) : null}
                    {(report.fixes?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ölçülen eksikler (önem sırasıyla)</h3>
                        <ol className="space-y-2">
                          {report.fixes!.map((f, i) => (
                            <li key={i} className="flex gap-2.5 text-sm rounded-xl border border-border p-3">
                              <span className="h-5 w-5 shrink-0 rounded-full bg-primary-500/10 text-primary-500 text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                              {f}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {(report.suggestions?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Editör önerileri</h3>
                        <ul className="space-y-2">
                          {report.suggestions!.map((s, i) => (
                            <li key={i} className="flex gap-2.5 text-sm rounded-xl bg-muted/30 p-3"><Sparkles className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" /> {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {tab === "seo" && report.seo && (
                  <div className="space-y-3">
                    <p className="text-sm">
                      Odak ifade: <strong>{report.seo.focusKeyword ?? "belirlenemedi"}</strong>
                      <span className="text-muted-foreground"> — okurun bu haberi ararken yazması en olası ifade</span>
                    </p>
                    {(report.seo.titleSuggestion || report.seo.descriptionSuggestion) && (
                      <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-3 space-y-2 text-sm">
                        {report.seo.titleSuggestion && (
                          <p><span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Önerilen başlık</span>{report.seo.titleSuggestion}</p>
                        )}
                        {report.seo.descriptionSuggestion && (
                          <p><span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Önerilen spot (arama sonucu açıklaması)</span>{report.seo.descriptionSuggestion}</p>
                        )}
                      </div>
                    )}
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {report.seo.checks.map((c) => (
                        <li key={c.id} className="flex items-start gap-2.5 px-3 py-2.5 text-sm">
                          {STATUS_ICON[c.status]}
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">{c.label}</span>
                            <span className="block text-xs text-muted-foreground">{c.detail}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tab === "readability" && report.readability && (
                  <div className="space-y-3">
                    <p className="text-sm">
                      Ateşman okunabilirlik indeksi: <strong>{report.readability.stats.atesman}</strong> ({report.readability.level}).
                      <span className="text-muted-foreground"> Türkçe haber metinlerinde 40 ve üzeri iyi kabul edilir; düşük değer uzun cümle ve kelimelere işaret eder.</span>
                    </p>
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        ["Kelime", report.readability.stats.words],
                        ["Okuma süresi", `${report.readability.stats.readingMinutes} dk`],
                        ["Cümle", report.readability.stats.sentences],
                        ["Ort. cümle", `${report.readability.stats.avgSentenceWords} kelime`],
                        ["Uzun cümle (25+)", report.readability.stats.longSentences],
                        ["Paragraf", report.readability.stats.paragraphs],
                        ["Uzun paragraf (90+)", report.readability.stats.longParagraphs],
                        ["Ara başlık", report.readability.stats.h2 + report.readability.stats.h3],
                      ].map(([k, v]) => (
                        <div key={String(k)} className="rounded-xl border border-border p-2.5">
                          <dt className="text-[11px] text-muted-foreground">{k}</dt>
                          <dd className="text-sm font-bold tabular-nums">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {tab === "originality" && report.originality && (
                  <div className="space-y-4">
                    <p className="text-sm">
                      Metnin <strong className={tone(100 - report.originality.copiedRate * 2.5)}>%{report.originality.copiedRate}</strong>&apos;i başka sitelerdeki metinlerle aynen örtüşüyor.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 rounded-xl bg-muted/30 p-3">
                      <li>• Haberin kaynakları: {report.originality.sourcesChecked} haber ({report.originality.fullTextChecked} tanesinin tam metni okundu)</li>
                      <li>
                        • İnternet taraması:{" "}
                        {!report.originality.web?.enabled ? "yapılmadı" : report.originality.web.error ? <span className="text-warning">{report.originality.web.error}</span>
                          : `${report.originality.web.queries} ayırt edici cümle arandı, ${report.originality.web.candidates} sayfa bulundu, ${report.originality.web.verified} sayfanın metni indirilip karşılaştırıldı`}
                      </li>
                      <li>• Sitedeki son {report.originality.siteArticlesChecked} haber</li>
                      <li>Karşılaştırma 5 kelimelik ifadeler düzeyinde yapılır; listedeki her sayfa gerçekten açılıp metni okunmuştur.</li>
                    </ul>

                    {(report.originality.passages?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aynen alınmış cümleler ({report.originality.passages!.length})</h3>
                          <button onClick={() => run("fix")} disabled={isPending} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer">
                            {busy("fix") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} {busy("fix") ? "Düzeltiliyor…" : "Kopyaları gider"}
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {report.originality.passages!.map((p, i) => (
                            <li key={i} className="rounded-xl border border-error/20 bg-error/5 p-3 text-sm space-y-1">
                              <p className="leading-relaxed">&ldquo;{p.text}&rdquo;</p>
                              <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1">
                                %{p.percent} aynı ·
                                {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-500 hover:underline truncate max-w-[16rem]">{p.source}</a> : <span>{p.source}</span>}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.originality.matches.length === 0 ? (
                      <p className="flex items-center gap-2 text-sm rounded-xl bg-success/10 p-3"><CheckCircle2 className="h-4 w-4 text-success" /> Belirgin bir örtüşme bulunmadı.</p>
                    ) : (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Örtüşen sayfalar</h3>
                        <ul className="divide-y divide-border rounded-xl border border-border">
                          {report.originality.matches.map((m, i) => (
                            <li key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium truncate">{m.title}</span>
                                <span className="text-[11px] text-muted-foreground">{KIND_LABEL[m.kind] ?? "Kaynak"}</span>
                              </span>
                              <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-bold", m.percent >= 30 ? "bg-error/10 text-error" : m.percent >= 10 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground")}>%{m.percent}</span>
                              {m.url && (
                                <a href={m.url} target="_blank" rel="noopener noreferrer" aria-label="Aç" className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"><ExternalLink className="h-4 w-4" /></a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {tab === "editor" && (
                  report.quality?.ai ? (
                    <div className="space-y-4">
                      {report.quality.comment && <p className="text-sm leading-relaxed rounded-xl bg-muted/30 p-3">{report.quality.comment}</p>}
                      {report.quality.strengths.length > 0 && (
                        <div className="space-y-1.5">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Güçlü yönler</h3>
                          <ul className="space-y-1.5">{report.quality.strengths.map((s, i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> {s}</li>)}</ul>
                        </div>
                      )}
                      {report.quality.issues.length > 0 && (
                        <div className="space-y-1.5">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sorunlar</h3>
                          <ul className="space-y-1.5">{report.quality.issues.map((s, i) => <li key={i} className="flex gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" /> {s}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-xl bg-muted/30 p-3">
                      Yapay zekâ editör değerlendirmesi bu analizde alınamadı (servis yoğun ya da yapılandırılmamış olabilir). Diğer puanlar ölçüme dayandığı için geçerlidir; birazdan yeniden analiz edebilirsiniz.
                    </p>
                  )
                )}
              </div>
            </>
          )}
        </div>

        {report && (
          <div className="px-4 sm:px-6 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 bg-muted/20">
            <button onClick={() => run("analyze")} disabled={isPending} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold text-primary-600 hover:bg-primary-500/10 disabled:opacity-50 cursor-pointer">
              <RefreshCw className={cn("h-3.5 w-3.5", busy("analyze") && "animate-spin")} /> {busy("analyze") ? "Analiz ediliyor…" : "Yeniden analiz et"}
            </button>
            <button
              onClick={() => run("rewrite")}
              disabled={isPending}
              title="Metni, analizdeki eksikleri giderecek şekilde yapay zekâ ile yeniden yazdırır"
              className="inline-flex items-center gap-1.5 h-10 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {busy("rewrite") ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {busy("rewrite") ? "Yeniden yazılıyor…" : "Eksikleri gidererek yeniden yaz"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
