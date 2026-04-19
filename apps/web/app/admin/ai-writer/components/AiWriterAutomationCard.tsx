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
      alert(`${res.results?.length} haber başarıyla yazıldı ve yayınlandı!`);
    } else {
      alert("Hata: " + res.error);
    }
    setRunning(false);
  };

  return (
    <div className="glass-strong rounded-3xl border border-border overflow-hidden shadow-2xl">
      <div className="bg-gradient-to-r from-amber-600/10 to-orange-600/10 px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold font-(family-name:--font-outfit)">AI Yazar Otomasyonu</h3>
            <p className="text-xs text-muted-foreground">Zamanlanmış otomatik haber üretimi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button
            onClick={handleManualRun}
            disabled={running}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            Şimdi Çalıştır
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {success ? "Kaydedildi!" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border">
          <div>
            <p className="font-bold text-sm">Otomatik Yazım Durumu</p>
            <p className="text-xs text-muted-foreground">Aktif edildiğinde sistem belirlenen aralıklarla haber yazar.</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              enabled ? "bg-primary-600" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Her Seferde Yazılacak Haber Sayısı
            </label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              {[1, 2, 3, 5, 10].map(n => (
                <option key={n} value={n}>{n} Haber</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Çalışma Sıklığı (Cron)
            </label>
            <select
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
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

        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-bold text-foreground mb-1">Nasıl Çalışır?</p>
          Sistem, belirlenen vakitte RSS önerileri arasından en yüksek puanlı (analiz edilmiş veya onaylanmış) haberleri seçer. 
          Ardından seçtiğin AI modelleri ile araştırmasını yapar, görselini üretir ve doğrudan yayına alır. 
          Bu işlem için <strong>QStash</strong> zamanlayıcısı kullanılır.
        </div>
      </div>
    </div>
  );
}
