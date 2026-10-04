import Link from "next/link";
import { Wand2, Users, SlidersHorizontal, Rss, PenLine, ImageIcon, Send, Timer, ArrowRight } from "lucide-react";
import { getTaskModel } from "@/lib/ai/client";
import { modelDisplayName } from "@/lib/ai/models";
import { getAutomationStatus, getSettingsRow } from "@/lib/server/automation";
import { countQueue } from "@/lib/news/queries";
import { formatRelativeTime } from "@/lib/utils";
import { RunJobButton } from "../components/RunJobButton";

export const dynamic = "force-dynamic";

function cronFrequency(cron: string) {
  if (cron === "0 9 * * *") return "Günde bir";
  const hours = Number(cron.split(" ")[1]?.split("/")[1]);
  return Number.isFinite(hours) && hours > 0 ? `${hours} saatte bir` : cron;
}

export default async function AdminAiWriterPage() {
  const [settings, writer, image, jobs, pending] = await Promise.all([
    getSettingsRow(),
    getTaskModel("writer"),
    getTaskModel("image"),
    getAutomationStatus(),
    countQueue(),
  ]);
  const job = jobs.find((j) => j.job === "writer")!;

  const stats = [
    { label: "Yazım modeli", value: modelDisplayName(writer) },
    { label: "Görsel modeli", value: modelDisplayName(image) },
    { label: "Yazım sırası", value: `${pending.toLocaleString("tr-TR")} konu` },
  ];

  const steps = [
    { icon: Rss, title: "Seçim", text: "Karar Merkezi'nde aynı olayın haberleri tek konuda toplanır, tekrarlar elenir ve konular puanlanır; en yüksek puanlı konu seçilir." },
    { icon: PenLine, title: "Yazım", text: "Konudaki tüm kaynaklar birleştirilerek (isteğe bağlı web aramasıyla) özgün bir haber yazılır; yazmadan önce son kez tekrar kontrolü yapılır." },
    { icon: ImageIcon, title: "Görsel", text: "Görsel modeli kapak üretir; olmazsa kaynak görsel kullanılır." },
    { icon: Send, title: "Yayın", text: "Haber yayınlanır, kalite analizi yapılır, Google ve Telegram bilgilendirilir." },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <Wand2 className="h-5.5 w-5.5 text-primary-500" />
            </div>
            AI Yazar
          </h1>
          <p className="text-muted-foreground text-sm">Önerilen haberleri otomatik olarak yazıp yayınlayan sistem.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/settings?tab=yapay-zeka" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" /> Model ve talimatlar
          </Link>
          <Link href="/admin/ai-writer/personas" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold hover:bg-muted/70">
            <Users className="h-4 w-4 text-primary-500" /> Yazar personaları
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-card min-w-0">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</p>
            <p className="mt-1 font-semibold text-sm truncate" title={s.value}>{s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 className="font-bold font-display flex items-center gap-2"><Timer className="h-4 w-4 text-primary-500" /> Otomatik yazım</h2>
          <p className="text-sm">
            {job.enabled
              ? <><span className="font-semibold text-success">Açık</span> · {cronFrequency(job.cron)} en iyi {settings.aiWriterAutoCount} öneri yazılır</>
              : <span className="font-semibold text-muted-foreground">Kapalı</span>}
          </p>
          {job.enabled && (job.lastRunAt || job.nextRunAt) && (
            <p className="text-xs text-muted-foreground">
              {job.lastRunAt && <>Son çalışma {formatRelativeTime(job.lastRunAt)}</>}
              {job.lastRunAt && job.nextRunAt && " · "}
              {job.nextRunAt && <>Sonraki {new Date(job.nextRunAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}</>}
            </p>
          )}
          <Link href="/admin/settings?tab=otomasyon" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-500">
            Sıklık ve adet ayarları <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <RunJobButton
          job="writer"
          label={`${settings.aiWriterAutoCount} haber yaz`}
          confirmText={`En iyi ${settings.aiWriterAutoCount} öneri şimdi yazılıp yayınlansın mı?`}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
        <h2 className="font-bold font-display mb-4">Nasıl çalışır?</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl bg-muted/40 border border-border p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-6 w-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">{i + 1}</span>
                <s.icon className="h-4 w-4 text-primary-500" /> {s.title}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Sıradaki konuları görmek, öne almak ya da tek tek yazdırmak için <Link href="/admin/karar-merkezi" className="text-primary-500 font-semibold">Karar Merkezi</Link>&apos;ni kullanın.
        </p>
      </section>
    </div>
  );
}
