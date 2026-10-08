"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckCircle2, KeyRound, Loader2, Save, Search, Send, Users } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import {
  findArticlesForPush,
  generateVapidKeys,
  sendArticlePush,
  updateNotificationSettings,
} from "../notification-actions";
import { SectionTitle } from "./SettingsFields";

interface Settings { enabled: boolean; autoBreaking: boolean; dailyLimit: number; quietStartHour: number; quietEndHour: number }
interface Log { id: string; title: string; body: string; automatic: boolean; recipients: number; delivered: number; failed: number; sentAt: Date }
type Hit = Awaited<ReturnType<typeof findArticlesForPush>>[number];

const inputClass = "h-10 rounded-xl border border-border bg-card px-3 text-sm";
const hours = Array.from({ length: 24 }, (_, h) => h);

export function NotificationPanel({ configured, settings: initial, subscribers, logs }: { configured: boolean; settings: Settings; subscribers: number; logs: Log[] }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [saving, startSave] = useTransition();
  const [sending, startSend] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [sendStatus, setSendStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    const t = setTimeout(() => {
      findArticlesForPush(q).then((r) => { if (!cancelled) setHits(r); }).catch(() => { if (!cancelled) setHits([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, configured]);

  const save = () => startSave(async () => {
    const res = await updateNotificationSettings(s);
    setStatus(res.success ? { ok: true, text: "Kaydedildi" } : { ok: false, text: res.error });
    if (res.success) router.refresh();
  });

  const send = () => picked && startSend(async () => {
    const res = await sendArticlePush(picked.id);
    setSendStatus(res.success ? { ok: true, text: res.message ?? "Gönderildi" } : { ok: false, text: res.error });
    if (res.success) { setPicked(null); router.refresh(); }
  });

  if (!configured) {
    return (
      <div className="space-y-4">
        <SectionTitle icon={KeyRound}>Kurulum</SectionTitle>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground max-w-3xl">
          <li>Aşağıdaki düğmeyle bir anahtar çifti üretin.</li>
          <li>
            Vercel → proje → Settings → Environment Variables bölümüne ekleyin: <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> (ortak anahtar)
            ve <code>VAPID_PRIVATE_KEY</code> (gizli anahtar). İsterseniz <code>VAPID_SUBJECT</code> olarak <code>mailto:</code> ile başlayan bir iletişim adresi.
          </li>
          <li>Yeniden yayına alın (redeploy). Bu sekmede ayarlar ve gönderim görünür.</li>
        </ol>
        <p className="text-sm text-warning">Anahtarları bir kez belirledikten sonra değiştirmeyin: değişirse mevcut tüm abonelikler geçersiz olur.</p>
        <button type="button" onClick={() => startSave(async () => { const r = await generateVapidKeys(); if (r.success) setKeys(r.data); })} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Anahtar çifti üret
        </button>
        {keys && (
          <div className="space-y-2 text-sm">
            <p className="font-semibold">NEXT_PUBLIC_VAPID_PUBLIC_KEY</p>
            <code className="block break-all rounded-xl bg-muted p-3 select-all">{keys.publicKey}</code>
            <p className="font-semibold">VAPID_PRIVATE_KEY <span className="font-normal text-error">(gizli; yalnızca Vercel&apos;e girin, kimseyle paylaşmayın)</span></p>
            <code className="block break-all rounded-xl bg-muted p-3 select-all">{keys.privateKey}</code>
            <p className="text-xs text-muted-foreground">Anahtarlar kaydedilmedi; sayfadan çıkınca kaybolur.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionTitle icon={BellRing}>Ayarlar</SectionTitle>
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> {subscribers.toLocaleString("tr-TR")} abone</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
            <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} className="mt-0.5 h-4 w-4 accent-primary-500" />
            <span className="text-sm"><span className="block font-semibold">Bildirimler açık</span><span className="block text-muted-foreground">Kapalıyken okurlara davet gösterilmez ve hiçbir bildirim gönderilmez.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
            <input type="checkbox" checked={s.autoBreaking} onChange={(e) => setS({ ...s, autoBreaking: e.target.checked })} className="mt-0.5 h-4 w-4 accent-primary-500" />
            <span className="text-sm"><span className="block font-semibold">Son dakika haberlerini otomatik bildir</span><span className="block text-muted-foreground">AI Yazar&apos;ın “son dakika” olarak değerlendirdiği haberler yayımlanınca gönderilir (sessiz saatler ve günlük sınır dışında).</span></span>
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-4 text-sm">
          <label className="space-y-1"><span className="block text-xs font-semibold">Günlük en fazla</span>
            <select value={s.dailyLimit} onChange={(e) => setS({ ...s, dailyLimit: Number(e.target.value) })} className={inputClass}>
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n} bildirim</option>)}
            </select>
          </label>
          <label className="space-y-1"><span className="block text-xs font-semibold">Sessiz saatler başlangıcı</span>
            <select value={s.quietStartHour} onChange={(e) => setS({ ...s, quietStartHour: Number(e.target.value) })} className={inputClass}>
              {hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </label>
          <label className="space-y-1"><span className="block text-xs font-semibold">Sessiz saatler bitişi</span>
            <select value={s.quietEndHour} onChange={(e) => setS({ ...s, quietEndHour: Number(e.target.value) })} className={inputClass}>
              {hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </label>
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
          </button>
          {status && <span role="status" className={cn("inline-flex items-center gap-1", status.ok ? "text-success" : "text-error")}>{status.ok && <CheckCircle2 className="h-4 w-4" />}{status.text}</span>}
        </div>
        <p className="text-xs text-muted-foreground">Sessiz saatler Türkiye saatine göredir; başlangıç ve bitiş aynıysa sessiz saat yoktur. Elle gönderim sessiz saatlerde de yapılabilir.</p>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={Send}>Haber bildir</SectionTitle>
        <div className="relative max-w-xl">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Haber başlığı ara (boşsa son yayınlananlar)" aria-label="Haber ara" className={cn(inputClass, "w-full pl-9")} />
        </div>
        <ul className="space-y-1 max-w-xl">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => { setPicked(h); setSendStatus(null); }} className={cn("w-full text-left rounded-xl border px-3 py-2 text-sm", picked?.id === h.id ? "border-primary-500 bg-primary-500/5" : "border-border hover:bg-muted/50")}>
                <span className="block font-medium line-clamp-1">{h.title}</span>
                {h.publishedAt && <span className="block text-xs text-muted-foreground">{formatDateTime(h.publishedAt)}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={send} disabled={!picked || sending || !s.enabled} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {picked ? "Seçilen haberi bildir" : "Önce bir haber seçin"}
          </button>
          {!s.enabled && <span className="text-sm text-muted-foreground">Göndermek için önce bildirimleri açıp kaydedin.</span>}
          {sendStatus && <span role="status" className={cn("text-sm", sendStatus.ok ? "text-success" : "text-error")}>{sendStatus.text}</span>}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle icon={BellRing}>Son gönderimler</SectionTitle>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz bildirim gönderilmedi.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border text-sm">
            {logs.map((l) => (
              <li key={l.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span className="flex-1 min-w-0 truncate font-medium">{l.body}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatDateTime(l.sentAt)} · {l.automatic ? "otomatik" : "elle"} · {l.delivered}/{l.recipients} ulaştı
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
