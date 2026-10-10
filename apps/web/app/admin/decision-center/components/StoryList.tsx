"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowUpToLine, CheckCircle2, ChevronDown, Clock, ExternalLink, Flame, GitBranch, Layers, Loader2,
  PenLine, RotateCcw, Sparkles, Undo2, X, XCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionTab, StoryView } from "@/lib/news/queries";
import { dismissStory, restoreStory, setStoryPinned, writeStoryNow } from "../actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  NEW: { label: "Değerlendiriliyor", cls: "bg-muted text-muted-foreground" },
  READY: { label: "Sırada", cls: "bg-primary-500/10 text-primary-500" },
  WRITING: { label: "Yazılıyor", cls: "bg-warning/15 text-warning" },
  PUBLISHED: { label: "Yayınlandı", cls: "bg-success/10 text-success" },
  DUPLICATE: { label: "Tekrar", cls: "bg-muted text-muted-foreground" },
  LOW_SCORE: { label: "Değeri düşük", cls: "bg-muted text-muted-foreground" },
  EXPIRED: { label: "Süresi geçti", cls: "bg-muted text-muted-foreground" },
  DISMISSED: { label: "Elendi", cls: "bg-muted text-muted-foreground" },
  FAILED: { label: "Yazılamadı", cls: "bg-error/10 text-error" },
};

const TZ = "Europe/Istanbul";

/** "bugün 20:00", "yarın 14:30" ya da "12 Eki 09:00" */
function formatWhen(iso: string, now: number) {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("tr-TR", { timeZone: TZ });
  const time = d.toLocaleTimeString("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  if (day(d) === day(new Date(now))) return `bugün ${time}`;
  if (day(d) === day(new Date(now + 86_400_000))) return `yarın ${time}`;
  if (day(d) === day(new Date(now - 86_400_000))) return `dün ${time}`;
  return `${d.toLocaleDateString("tr-TR", { timeZone: TZ, day: "numeric", month: "short" })} ${time}`;
}

/** Sunucu ve tarayıcıda aynı sonucu vermesi için "şimdi" dışarıdan verilir */
function ago(iso: string, now: number) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} sa önce` : `${Math.round(h / 24)} gün önce`;
}

function hoursLeft(iso: string, now: number) {
  return (new Date(iso).getTime() - now) / 3_600_000;
}

function ScoreRing({ score, muted }: { score: number; muted?: boolean }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const color = muted ? "stroke-muted-foreground/40" : score >= 75 ? "stroke-success" : score >= 55 ? "stroke-primary-500" : "stroke-warning";
  return (
    <div className="relative h-11 w-11 shrink-0" aria-label={`Puan ${score}`}>
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={r} className="stroke-muted fill-none" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} className={cn("fill-none", color)} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">{score}</span>
    </div>
  );
}

function Chip({ icon: Icon, children, tone = "default", title }: { icon?: typeof Clock; children: React.ReactNode; tone?: "default" | "hot" | "urgent" | "info"; title?: string }) {
  const cls = {
    default: "bg-muted text-muted-foreground",
    hot: "bg-error/10 text-error",
    urgent: "bg-warning/15 text-warning",
    info: "bg-primary-500/10 text-primary-500",
  }[tone];
  return (
    <span title={title} className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

function ScoreBreakdown({ s }: { s: StoryView }) {
  if (!s.parts) return null;
  const rows = [
    { label: "Haber değeri", value: s.parts.importance, weight: "%55", hint: s.fallback ? "Yapay zekâ kullanılamadı; varsayılan 50" : "Yapay zekânın değerlendirmesi" },
    { label: "Yaygınlık", value: s.parts.coverage, weight: "%25", hint: `${s.sourceCount} farklı kaynak` },
    { label: "Tazelik", value: s.parts.freshness, weight: "%20", hint: "Zaman geçtikçe azalır" },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-xs" title={r.hint}>
          <span className="text-muted-foreground">{r.label} <span className="opacity-60">{r.weight}</span></span>
          <span className="h-1.5 rounded-full bg-muted overflow-hidden"><span className="block h-full rounded-full bg-primary-500" style={{ width: `${r.value}%` }} /></span>
          <span className="text-right tabular-nums font-semibold">{r.value}</span>
        </div>
      ))}
      {(s.parts.trend > 0 || s.parts.urgency > 0) && (
        <p className="text-xs text-muted-foreground">
          Ek puan: {s.parts.trend > 0 && <span className="font-semibold text-foreground">+{s.parts.trend} trend</span>}
          {s.parts.trend > 0 && s.parts.urgency > 0 && " · "}
          {s.parts.urgency > 0 && <span className="font-semibold text-foreground">+{s.parts.urgency} aciliyet</span>}
        </p>
      )}
    </div>
  );
}

function StoryCard({ s, rank, tab, now, minScore, busy, writing, onWrite, onAction }: {
  s: StoryView;
  rank: number | null;
  tab: DecisionTab;
  now: number;
  minScore: number;
  busy: boolean;
  /** "Şimdi yaz"a basıldı, yazım sürüyor (sayfa yenilenmeden durum gösterilir) */
  writing: boolean;
  onWrite: () => void;
  onAction: (fn: () => Promise<{ success: boolean; message?: string; error?: string }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const shownStatus = writing ? "WRITING" : s.status;
  const status = STATUS[shownStatus] ?? STATUS.NEW;
  const eliminated = ["DUPLICATE", "LOW_SCORE", "EXPIRED", "DISMISSED", "FAILED"].includes(s.status);
  const editable = !writing && (s.status === "READY" || s.status === "NEW");
  const left = s.expiresAt ? hoursLeft(s.expiresAt, now) : null;
  const eventSoon = s.eventAt && hoursLeft(s.eventAt, now) > 0;

  return (
    <li className={cn("rounded-2xl border bg-card p-3.5 sm:p-4 shadow-card min-w-0", s.pinned ? "border-primary-500/50" : "border-border")}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <ScoreRing score={s.score} muted={eliminated || s.status === "PUBLISHED"} />
          {rank !== null && <span className="text-[10px] font-bold text-muted-foreground">#{rank}</span>}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", status.cls)}>
              {shownStatus === "WRITING" && <Loader2 className="inline h-3 w-3 mr-0.5 animate-spin" />}{status.label}
            </span>
            {s.pinned && <Chip icon={ArrowUpToLine} tone="info">Öne alındı</Chip>}
            {s.urgency === "BREAKING" && <Chip icon={Zap} tone="hot">Son dakika</Chip>}
            {s.categoryName && <Chip>{s.categoryName}</Chip>}
            {tab === "queue" && s.status === "READY" && s.score < minScore && s.pinned && <Chip>eşik altı</Chip>}
          </div>

          <h3 className="font-semibold leading-snug">{s.headline || s.title}</h3>
          {s.summary && <p className="text-sm text-muted-foreground line-clamp-2">{s.summary}</p>}

          <div className="flex flex-wrap gap-1.5">
            <Chip icon={Layers} title="Bu olayı haber yapan farklı kaynak sayısı">{s.sourceCount} kaynak{s.itemCount > s.sourceCount ? ` · ${s.itemCount} haber` : ""}</Chip>
            {s.trendKeyword && <Chip icon={Flame} tone="hot" title={`Google Trends eşleşmesi (${s.trendScore})`}>Trend: {s.trendKeyword}</Chip>}
            {eventSoon && <Chip icon={Clock} tone="urgent" title="Planlı olay zamanı; haber bundan önce yazılmalı">Olay {formatWhen(s.eventAt!, now)}</Chip>}
            {!eventSoon && editable && left !== null && left > 0 && left < 12 && <Chip icon={Clock} tone="urgent">{Math.max(1, Math.round(left))} saat içinde eskiyecek</Chip>}
            {s.related && <Chip icon={GitBranch} tone="info" title="Daha önce yayımladığımız haberin yeni gelişmesi">Devam: {s.related.title}</Chip>}
            <Chip icon={Clock} title="Konunun ilk görüldüğü an">{ago(s.firstSeenAt, now)}</Chip>
          </div>

          {s.status === "PUBLISHED" && s.article && (
            <Link href={`/article/${s.article.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> {s.article.title}
            </Link>
          )}
          {s.duplicate && (
            <p className="text-xs text-muted-foreground">
              Yayındaki haber: <Link href={`/article/${s.duplicate.slug}`} target="_blank" className="font-semibold text-primary-500">{s.duplicate.title}</Link>
            </p>
          )}
          {s.reason && !s.duplicate && <p className="text-xs text-muted-foreground italic">{s.reason}</p>}
          {s.lastError && s.status !== "PUBLISHED" && !writing && (
            <p className="flex items-start gap-1 text-xs text-error"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> Son deneme: {s.lastError}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(editable || (s.status === "FAILED" && !writing)) && (
              <button disabled={busy} onClick={onWrite} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold disabled:opacity-50">
                <PenLine className="h-3.5 w-3.5" /> Şimdi yaz
              </button>
            )}
            {editable && (
              <button disabled={busy} onClick={() => onAction(() => setStoryPinned(s.id, !s.pinned))} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50">
                {s.pinned ? <><Undo2 className="h-3.5 w-3.5" /> Önceliği kaldır</> : <><ArrowUpToLine className="h-3.5 w-3.5" /> Öne al</>}
              </button>
            )}
            {(editable || (s.status === "FAILED" && !writing)) && (
              <button disabled={busy} onClick={() => onAction(() => dismissStory(s.id))} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-error/10 hover:text-error disabled:opacity-50">
                <X className="h-3.5 w-3.5" /> Ele
              </button>
            )}
            {eliminated && s.status !== "FAILED" && (
              <button disabled={busy} onClick={() => onAction(() => restoreStory(s.id))} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted disabled:opacity-50">
                <RotateCcw className="h-3.5 w-3.5" /> Geri al
              </button>
            )}
            <button onClick={() => setOpen(!open)} aria-expanded={open} className="ml-auto inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted">
              Ayrıntı <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            </button>
          </div>

          {open && (
            <div className="mt-2 grid gap-4 rounded-xl bg-muted/40 p-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Puan nasıl hesaplandı?</p>
                {s.parts ? <ScoreBreakdown s={s} /> : <p className="text-xs text-muted-foreground">Henüz değerlendirilmedi.</p>}
                {s.expiresAt && <p className="text-xs text-muted-foreground">Geçerlilik sonu: {formatWhen(s.expiresAt, now)}</p>}
              </div>
              <div className="space-y-2 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Kaynak haberler</p>
                <ul className="space-y-1.5">
                  {s.items.map((i) => (
                    <li key={i.id} className="text-xs min-w-0">
                      <a href={i.url} target="_blank" rel="noreferrer" className="group flex items-start gap-1.5 hover:text-primary-500">
                        <ExternalLink className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                        <span className="min-w-0">
                          <span className="font-semibold">{i.source}</span>
                          {i.publishedAt && <span className="text-muted-foreground"> · {formatWhen(i.publishedAt, now)}</span>}
                          <span className="block text-muted-foreground group-hover:text-primary-500 line-clamp-2">{i.title}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                  {s.items.length === 0 && <li className="text-xs text-muted-foreground">Google Trends&apos;ten yazıldı.</li>}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

const EMPTY: Record<string, { title: string; text: string }> = {
  queue: { title: "Yazım sırası boş", text: "Puanı eşiği geçen konu yok. Yeni haberler için kaynakları tarayın ya da 'Değerlendirilen' sekmesinden bir konuyu öne alın." },
  review: { title: "Değerlendirilen konu yok", text: "Kaynaklar tarandığında yeni konular burada görünür." },
  published: { title: "Henüz yayınlanan konu yok", text: "AI Yazar'ın yazdığı haberler burada listelenir." },
  rejected: { title: "Son 3 günde elenen konu yok", text: "Tekrar, düşük değerli ya da süresi geçen konular burada görünür." },
};

export function StoryList({ stories, tab, minScore, offset, now }: { stories: StoryView[]; tab: DecisionTab; minScore: number; offset: number; now: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null);

  const onAction = (fn: () => Promise<{ success: boolean; message?: string; error?: string }>, done?: () => void) => {
    setMessage(null);
    start(async () => {
      const r = await fn();
      setMessage(r.success ? { ok: true, text: r.message ?? "Tamam." } : { ok: false, text: r.error ?? "İşlem başarısız." });
      router.refresh();
      done?.();
    });
  };
  const onWrite = (id: string) => {
    setWritingId(id);
    onAction(() => writeStoryNow(id), () => setWritingId(null));
  };

  // Sıra numarası yalnızca bekleyen konulara verilir (yazılmakta olanlar hariç)
  let rank = 0;

  if (stories.length === 0) {
    const e = EMPTY[tab] ?? EMPTY.sira;
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="font-semibold">{e.title}</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{e.text}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(message || busy) && (
        <p role="status" className={cn("flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm",
          busy ? "border-border bg-card" : message?.ok ? "border-success/30 bg-success/10" : "border-error/30 bg-error/5")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" /> : message?.ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-error shrink-0 mt-0.5" />}
          <span className="min-w-0 break-words">{busy ? "İşleniyor… Haber yazımı bir-iki dakika sürebilir." : message?.text}</span>
        </p>
      )}
      <ul className="space-y-3">
        {stories.map((s) => (
          <StoryCard key={s.id} s={s} rank={tab === "queue" && s.status === "READY" ? offset + ++rank : null} tab={tab} now={now} minScore={minScore} busy={busy} writing={writingId === s.id} onWrite={() => onWrite(s.id)} onAction={onAction} />
        ))}
      </ul>
    </div>
  );
}
