"use client";

import { useState } from "react";
import { Zap, Clock, Save, Loader2, PlayCircle } from "lucide-react";
import { updateAiWriterAutomation, triggerBatchAiWriter } from "../../rss-feeds/actions";

interface Props {
  enabled: boolean;
  count: number;
  cron: string;
}

export function AiWriterAutomationCard({ enabled: initialEnabled, count: initialCount, cron: initialCron }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [count, setCount] = useState(initialCount);
  const [cron, setCron] = useState(initialCron);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const res = await updateAiWriterAutomation({ enabled, count, cron });
    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  const handleManualRun = async () => {
    if (!confirm(`${count} adet haberi şimdi yazdırmak istediğinize emin misiniz?`)) return;
    setRunning(true);
    const res = await triggerBatchAiWriter(count);
    
    if (res.success) {
      alert(`${res.enqueued} haber başarıyla kuyruğa eklendi. Arka planda yazılıp yayına alınacaktır.`);
    } else {
      alert("Hata: " + res.error);
    }
    setRunning(false);
  };

  return (
    <div className="glass-strong rounded-[2.5rem] border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xl transition-all">
      <div className="bg-gradient-to-r from-amber-600/5 to-orange-600/5 dark:from-amber-600/10 dark:to-orange-600/10 px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
            <Zap className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg font-(family-name:--font-outfit) text-neutral-900 dark:text-white">AI Yazar Otomasyonu</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Zamanlanmış otomatik haber üretimi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button
            onClick={handleManualRun}
            disabled={running}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            Şimdi Çalıştır
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary-500/25 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {success ? "Kaydedildi!" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between p-5 bg-[var(--card)] text-[var(--card-fg)] rounded-[1.5rem] border border-border transition-all hover:bg-black/5 dark:hover:bg-white/5">
          <div>
            <p className="font-bold text-sm dark:text-neutral-200 text-neutral-900">Otomatik Yazım Durumu</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Aktif edildiğinde sistem belirlenen aralıklarla haber yazar.</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${enabled ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-800"}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${enabled ? "translate-x-7" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Haber Sayısı (Batch)
            </label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-[var(--card)] text-[var(--card-fg)] border border-border rounded-[1.25rem] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 transition-all appearance-none shadow-sm"
            >
              {[1, 2, 3, 5, 10].map(n => (
                <option key={n} value={n}>{n} Haber</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Çalışma Sıklığı
            </label>
            <select
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="w-full bg-[var(--card)] text-[var(--card-fg)] border border-border rounded-[1.25rem] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 transition-all appearance-none shadow-sm"
            >
              <option value="0 * * * *">Her Saat Başı</option>
              <option value="0 */2 * * *">2 Saatte Bir</option>
              <option value="0 */4 * * *">4 Saatte Bir</option>
              <option value="0 */6 * * *">6 Saatte Bir</option>
              <option value="0 */12 * * *">12 Saatte Bir (Günde 2 kez)</option>
              <option value="0 0 * * *">Her Gün Gece 00:00</option>
            </select>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/10 rounded-[1.5rem] p-6 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          <p className="font-bold text-neutral-900 dark:text-neutral-200 mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Sistem Nasıl Çalışır?
          </p>
          Sistem, belirlenen vakitte RSS önerileri arasından en yüksek puanlı (analiz edilmiş veya onaylanmış) haberleri seçer. 
          Ardından seçtiğin AI modelleri ile araştırmasını yapar, görselini üretir ve doğrudan yayına alır. 
          Bu işlem için <strong>QStash</strong> zamanlayıcısı kullanılır.
        </div>
      </div>
    </div>
  );
}
