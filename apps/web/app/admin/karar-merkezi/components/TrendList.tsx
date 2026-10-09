"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Flame, Layers, Loader2, Sparkles, Wand2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendView } from "@/lib/news/queries";
import { writeTrendNow } from "../actions";

export function TrendList({ trends, enabled, searchEnabled }: { trends: TrendView[]; enabled: boolean; searchEnabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const write = (t: TrendView) => {
    if (!confirm(`"${t.keyword}" hakkında web aramasıyla haber yazılıp yayınlansın mı?`)) return;
    setMsg(null);
    setBusyId(t.id);
    start(async () => {
      const r = await writeTrendNow(t.id);
      setMsg(r.success ? { ok: true, text: r.message } : { ok: false, text: r.error });
      setBusyId(null);
      router.refresh();
    });
  };

  if (trends.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {enabled ? "Son 24 saatte trend verisi yok. 'Tara ve değerlendir' ile güncelleyin." : "Google Trends takibi kapalı. Ayarlar > Otomasyon'dan açabilirsiniz."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Trende uyan konuların puanı otomatik artar.{" "}
        {searchEnabled
          ? "Haberi olmayan trendler için web aramasıyla haber yazabilirsiniz; son 2 günde işlenmiş trendler yazılmaz."
          : "Haberi olmayan trendler yalnızca web aramasıyla yazılabilir; web araması Ayarlar → Yapay Zekâ'da kapalı olduğu için bu trendler yazılmaz."}
      </p>
      {msg && (
        <p role="status" className={cn("flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm", msg.ok ? "border-success/30 bg-success/10" : "border-error/30 bg-error/5")}>
          {msg.ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-error shrink-0 mt-0.5" />}
          <span className="min-w-0 break-words">{msg.text}</span>
        </p>
      )}
      <ul className="grid gap-2 md:grid-cols-2">
        {trends.map((t) => (
          <li key={t.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-card min-w-0 space-y-2">
            <div className="flex items-start gap-3">
              <Flame className={cn("h-5 w-5 shrink-0 mt-0.5", t.trafficScore >= 85 ? "text-error" : "text-warning")} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold break-words">
                  {t.keyword}
                  {t.exploreUrl && (
                    <a href={t.exploreUrl} target="_blank" rel="noreferrer" aria-label="Google Trends'te aç" className="ml-1.5 inline-flex align-middle text-muted-foreground hover:text-primary-500">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{t.searchVolume ? `${t.searchVolume} arama` : "Popüler"} · trafik {t.trafficScore}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {t.covered ? (
                <Link href={`/article/${t.covered.slug}`} target="_blank" className="flex-1 min-w-0 flex items-center gap-1.5 text-success font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Yayında: {t.covered.title}</span>
                </Link>
              ) : t.story ? (
                <span className="flex-1 min-w-0 flex items-center gap-1.5 text-primary-500 font-semibold">
                  <Layers className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Konu sırada ({t.story.score} puan): {t.story.title}</span>
                </span>
              ) : (
                <>
                  <span className="flex-1 min-w-0 flex items-center gap-1.5 text-muted-foreground"><Sparkles className="h-3.5 w-3.5 shrink-0" />Kaynaklarda karşılığı yok</span>
                  {searchEnabled && <button disabled={pending} onClick={() => write(t)} className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border font-semibold hover:bg-muted disabled:opacity-50">
                    {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 text-primary-500" />}
                    {busyId === t.id ? "Yazılıyor…" : "Haber yaz"}
                  </button>}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
