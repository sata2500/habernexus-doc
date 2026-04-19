"use client";

import { useState } from "react";
import { Clock, CheckCircle2, Loader2, AlertCircle, Database } from "lucide-react";
import { updateCronSchedule, setupNewsletterCron, updateRssRetention } from "../cron-actions";

type Props = {
  scanCron: string;
  analyzeCron: string;
  hasNewsletter: boolean;
  retentionDays: number;
};

const SCHEDULE_OPTIONS = [
  { label: "1 Saatte Bir", value: "0 * * * *" },
  { label: "2 Saatte Bir", value: "0 */2 * * *" },
  { label: "4 Saatte Bir", value: "0 */4 * * *" },
  { label: "6 Saatte Bir", value: "0 */6 * * *" },
  { label: "12 Saatte Bir", value: "0 */12 * * *" },
  { label: "Günde 1 Kez", value: "0 6 * * *" },
];

const RETENTION_OPTIONS = [
  { label: "3 Gün Sakla", value: 3 },
  { label: "7 Gün Sakla", value: 7 },
  { label: "14 Gün Sakla", value: 14 },
  { label: "30 Gün Sakla", value: 30 },
];

export function CronSettingsCard({ 
  scanCron: initialScan, 
  analyzeCron: initialAnalyze, 
  hasNewsletter: initialHasNewsletter,
  retentionDays: initialRetention
}: Props) {
  const [scanCron, setScanCron] = useState(initialScan);
  const [analyzeCron, setAnalyzeCron] = useState(initialAnalyze);
  const [retentionDays, setRetentionDays] = useState(initialRetention);
  const [hasNewsletter, setHasNewsletter] = useState(initialHasNewsletter);
  const [loadingType, setLoadingType] = useState<"scan" | "analyze" | "newsletter" | "retention" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleNewsletterSetup = async () => {
    setLoadingType("newsletter");
    setMessage(null);

    const res = await setupNewsletterCron();
    if (res.success) {
      setHasNewsletter(true);
      setMessage({ type: "success", text: "Bülten otomasyonu başarıyla başlatıldı." });
    } else {
      setMessage({ type: "error", text: res.error || "Bülten otomasyonu başlatılamadı." });
    }
    setLoadingType(null);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUpdate = async (type: "scan" | "analyze", expression: string) => {
    setLoadingType(type);
    setMessage(null);

    const res = await updateCronSchedule(type, expression);

    if (res.success) {
      if (type === "scan") setScanCron(expression);
      else setAnalyzeCron(expression);
      setMessage({ type: "success", text: "Zamanlama başarıyla güncellendi." });
    } else {
      setMessage({ type: "error", text: res.error || "Güncellenirken bir hata oluştu." });
      if (type === "scan") setScanCron(initialScan);
      else setAnalyzeCron(initialAnalyze);
    }
    
    setLoadingType(null);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleRetentionUpdate = async (days: number) => {
    setLoadingType("retention");
    setMessage(null);

    const res = await updateRssRetention(days);
    if (res.success) {
      setRetentionDays(days);
      setMessage({ type: "success", text: "Temizlik süresi başarıyla güncellendi." });
    } else {
      setMessage({ type: "error", text: res.error || "Temizlik süresi güncellenemedi." });
      setRetentionDays(initialRetention);
    }
    setLoadingType(null);
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="glass-strong rounded-2xl border border-border shadow-soft overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary-500" />
        <h3 className="font-bold font-(family-name:--font-outfit)">Otomasyon ve Temizlik (QStash)</h3>
      </div>
      
      <div className="p-5 space-y-5">
        {message && (
          <div className={`p-3 rounded-xl text-sm font-medium flex items-start gap-2 ${
            message.type === "success" 
              ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scan Setting */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center justify-between">
              RSS Tarama Sıklığı
              {loadingType === "scan" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" />}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Dış kaynaklara bağlanıp yeni haberleri ne sıklıkla çekeceğini belirler.
            </p>
            <select
              value={scanCron}
              onChange={(e) => handleUpdate("scan", e.target.value)}
              disabled={loadingType !== null}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:opacity-50"
            >
              {SCHEDULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              {!SCHEDULE_OPTIONS.some(o => o.value === scanCron) && (
                <option value={scanCron}>Özel: {scanCron}</option>
              )}
            </select>
          </div>

          {/* Analyze Setting */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center justify-between">
              AI Analiz Sıklığı
              {loadingType === "analyze" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" />}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Çekilen haberlerin ne sıklıkla yapay zeka tarafından puanlanacağını belirler.
            </p>
            <select
              value={analyzeCron}
              onChange={(e) => handleUpdate("analyze", e.target.value)}
              disabled={loadingType !== null}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:opacity-50"
            >
              {SCHEDULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              {!SCHEDULE_OPTIONS.some(o => o.value === analyzeCron) && (
                <option value={analyzeCron}>Özel: {analyzeCron}</option>
              )}
            </select>
          </div>

          {/* Retention Setting */}
          <div className="space-y-2 md:col-span-2 pt-4 border-t border-border">
            <label className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Veritabanı Temizliği (Garbage Collection)
              </span>
              {loadingType === "retention" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" />}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              İşlenmiş, reddedilmiş veya ilgi çekmeyen (Düşük Puanlı) eski haberler ne kadar süre saklanıp silinsin?
            </p>
            <select
              value={retentionDays}
              onChange={(e) => handleRetentionUpdate(Number(e.target.value))}
              disabled={loadingType !== null}
              className="w-full sm:w-1/2 px-3 py-2.5 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:opacity-50"
            >
              {RETENTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Newsletter Setup */}
          <div className="space-y-2 md:col-span-2 pt-4 border-t border-border">
            <label className="text-sm font-semibold flex items-center justify-between">
              Bülten Otomasyonu (Saatlik)
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Kullanıcıların seçtiği saatlerde e-posta alabilmesi için bu otomasyonun başlatılması gerekir (her saat başı tetiklenir).
            </p>
            {hasNewsletter ? (
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2.5 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
                Sistem Aktif ve Ayarlandı
              </div>
            ) : (
              <button
                onClick={handleNewsletterSetup}
                disabled={loadingType === "newsletter"}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {loadingType === "newsletter" && <Loader2 className="h-4 w-4 animate-spin" />}
                Otomasyonu Başlat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
