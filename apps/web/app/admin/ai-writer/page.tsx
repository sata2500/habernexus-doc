import Link from "next/link";
import { Wand2, Users, SlidersHorizontal, Rss, PenLine, ImageIcon, Send } from "lucide-react";
import { getSystemSettings } from "../rss-feeds/cron-actions";
import { AiWriterAutomationCard } from "./components/AiWriterAutomationCard";
import { getTaskModel } from "@/lib/ai/client";
import { modelDisplayName } from "@/lib/ai/models";

function cronFrequency(cron: string) {
  const hours = Number(cron.split(" ")[1]?.split("/")[1]);
  return Number.isFinite(hours) && hours > 0 ? `Günde ${Math.round(24 / hours)} kez` : cron;
}

export default async function AdminAiWriterPage() {
  const [settings, writer, image] = await Promise.all([
    getSystemSettings(),
    getTaskModel("writer"),
    getTaskModel("image"),
  ]);

  const stats = [
    { label: "Yazım modeli", value: modelDisplayName(writer) },
    { label: "Görsel modeli", value: modelDisplayName(image) },
    { label: "Otomasyon", value: settings.aiWriterAutoEnabled ? `Açık · ${cronFrequency(settings.aiWriterAutoCron)}` : "Kapalı" },
  ];

  const steps = [
    { icon: Rss, title: "Seçim", text: "RSS haberleri analiz modeliyle puanlanır; en iyi öneriler seçilir." },
    { icon: PenLine, title: "Yazım", text: "Yazım modeli (isteğe bağlı web aramasıyla) özgün bir haber yazar." },
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

      <AiWriterAutomationCard
        enabled={settings.aiWriterAutoEnabled}
        count={settings.aiWriterAutoCount}
        cron={settings.aiWriterAutoCron}
      />

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
          Önerileri tek tek yazdırmak için <Link href="/admin/rss-feeds" className="text-primary-500 font-semibold">RSS Önerileri</Link> sayfasını kullanın.
        </p>
      </section>
    </div>
  );
}
