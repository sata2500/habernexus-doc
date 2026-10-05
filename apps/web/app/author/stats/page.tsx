import Link from "next/link";
import { BarChart3, Eye, FileText, Heart, MessageSquare, TrendingUp } from "lucide-react";
import { getAuthorStats } from "@/lib/server/author-desk";
import { formatViewCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuthorStatsPage() {
  const s = await getAuthorStats();
  const maxTop = s.top[0]?.viewCount || 1;
  const maxCat = s.categories[0]?.views || 1;

  const cards = [
    { label: "Toplam okunma", value: formatViewCount(s.views), sub: `Haber başına ort. ${formatViewCount(s.avgViews)}`, icon: Eye },
    { label: "Yayındaki haber", value: s.published.toLocaleString("tr-TR"), sub: `Son 30 günde ${s.published30}`, icon: FileText },
    { label: "Yorum", value: s.comments.toLocaleString("tr-TR"), sub: "Tüm haberlerinde", icon: MessageSquare },
    { label: "Okur tepkisi", value: s.reactions.toLocaleString("tr-TR"), sub: "Tüm haberlerinde", icon: Heart },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
          <BarChart3 className="h-6 w-6 text-primary-500" /> İstatistikler
        </h1>
        <p className="text-sm text-muted-foreground">Yayındaki haberlerinin okunma ve etkileşim özeti.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4 shadow-card min-w-0">
            <span className="flex items-center gap-2 text-muted-foreground"><c.icon className="h-4 w-4 shrink-0" /><span className="text-xs font-semibold truncate">{c.label}</span></span>
            <span className="mt-2 block text-2xl font-bold font-display tabular-nums">{c.value}</span>
            <span className="block text-[11px] text-muted-foreground truncate">{c.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <section className="lg:col-span-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-card min-w-0">
          <h2 className="font-bold font-display flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4 text-primary-500" /> En çok okunanlar</h2>
          {s.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz yayınlanmış haberin yok.</p>
          ) : (
            <ol className="space-y-3">
              {s.top.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-sm font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <Link href={`/article/${a.slug}`} target="_blank" className="block text-sm font-semibold truncate hover:text-primary-500">{a.title}</Link>
                    <span className="mt-1 block h-1.5 rounded-full bg-muted overflow-hidden"><span className="block h-full rounded-full bg-primary-500" style={{ width: `${(a.viewCount / maxTop) * 100}%` }} /></span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    <span className="block font-semibold text-foreground">{formatViewCount(a.viewCount)}</span>
                    {a._count.comments > 0 && <span>{a._count.comments} yorum</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-card min-w-0">
          <h2 className="font-bold font-display mb-4">Kategorilere göre</h2>
          {s.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Veri yok.</p>
          ) : (
            <ul className="space-y-3">
              {s.categories.map((c) => (
                <li key={c.name} className="space-y-1">
                  <p className="flex justify-between gap-2 text-sm">
                    <span className="font-semibold truncate">{c.name} <span className="font-normal text-muted-foreground">· {c.count} haber</span></span>
                    <span className="tabular-nums text-muted-foreground">{formatViewCount(c.views)}</span>
                  </p>
                  <span className="block h-1.5 rounded-full bg-muted overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${(c.views / maxCat) * 100}%`, backgroundColor: c.color || "var(--color-primary-500)" }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground">Okunma sayıları haber yayına girdiğinden bu yana toplamdır.</p>
        </section>
      </div>
    </div>
  );
}
