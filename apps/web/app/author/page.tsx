import Link from "next/link";
import { ArrowRight, Eye, FileClock, FileText, MessageSquare, PenSquare, Sparkles } from "lucide-react";
import { getAuthorOverview } from "@/lib/server/author-desk";
import { getAuthorSuggestions } from "./suggestions/actions";
import { WriteSuggestionButton } from "./suggestions/components/WriteSuggestionButton";
import { formatRelativeTime, formatViewCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuthorDashboardPage() {
  const [{ name, counts, recent, draftList, latestComments }, suggestions] = await Promise.all([
    getAuthorOverview(),
    getAuthorSuggestions().then((s) => s.slice(0, 3)),
  ]);

  const kpis = [
    { label: "Yayındaki haber", value: counts.published.toLocaleString("tr-TR"), icon: FileText, href: "/author/articles?status=PUBLISHED" },
    { label: "Taslak", value: counts.drafts.toLocaleString("tr-TR"), icon: FileClock, href: "/author/articles?status=DRAFT" },
    { label: "Toplam okunma", value: formatViewCount(counts.views), icon: Eye, href: "/author/stats" },
    { label: "Yorum (30 gün)", value: counts.comments30.toLocaleString("tr-TR"), icon: MessageSquare, href: "/author/comments" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold font-display">Merhaba{name ? `, ${name.split(" ")[0]}` : ""} 👋</h1>
          <p className="text-sm text-muted-foreground">Yazar masana hoş geldin.</p>
        </div>
        <Link href="/author/articles/new" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold">
          <PenSquare className="h-4 w-4" /> Yeni haber
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-2xl border border-border bg-card p-4 shadow-card min-w-0 hover:border-primary-500/40 transition-colors">
            <span className="flex items-center gap-2 text-muted-foreground">
              <k.icon className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold truncate">{k.label}</span>
            </span>
            <span className="mt-2 block text-2xl font-bold font-display tabular-nums">{k.value}</span>
          </Link>
        ))}
      </div>

      {draftList.length > 0 && (
        <section className="space-y-2" aria-labelledby="drafts-title">
          <h2 id="drafts-title" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Yarım kalan taslaklar</h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {draftList.map((d) => (
              <li key={d.id}>
                <Link href={`/author/articles/${d.id}/edit`} className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-3 hover:border-warning/60 transition-colors">
                  <FileClock className="h-5 w-5 text-warning shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{d.title || "Başlıksız taslak"}</span>
                    <span className="block text-[11px] text-muted-foreground">{formatRelativeTime(d.updatedAt, { compact: true })} düzenlendi</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-border bg-card shadow-card min-w-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-bold font-display flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary-500" /> Yazılmayı bekleyen konular</h2>
            <Link href="/author/suggestions" className="text-xs font-semibold text-primary-500">Tümü</Link>
          </div>
          <ul className="divide-y divide-border">
            {suggestions.length === 0 && <li className="p-4 text-sm text-muted-foreground">Şu an önerilen konu yok.</li>}
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="h-9 w-9 shrink-0 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center text-xs font-bold tabular-nums">{s.aiScore ?? "–"}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold line-clamp-2">{s.aiAnalysis.suggestedTitles[0] ?? s.title}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{s.source.name}</span>
                </span>
                <WriteSuggestionButton id={s.id} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-card min-w-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-bold font-display">Son yayınlarım</h2>
            <Link href="/author/articles" className="text-xs font-semibold text-primary-500">Tümü</Link>
          </div>
          <ul className="divide-y divide-border">
            {recent.length === 0 && <li className="p-4 text-sm text-muted-foreground">Henüz yayınlanmış haberin yok.</li>}
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 min-w-0">
                  <Link href={`/author/articles/${a.id}/edit`} className="block text-sm font-semibold truncate hover:text-primary-500">{a.title}</Link>
                  <span className="block text-[11px] text-muted-foreground">{a.category?.name ?? "Kategorisiz"} · {a.publishedAt ? formatRelativeTime(a.publishedAt, { compact: true }) : ""}</span>
                </span>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums"><Eye className="h-3.5 w-3.5" /> {formatViewCount(a.viewCount)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold font-display">Son yorumlar</h2>
          <Link href="/author/comments" className="text-xs font-semibold text-primary-500">Tümü</Link>
        </div>
        <ul className="divide-y divide-border">
          {latestComments.length === 0 && <li className="p-4 text-sm text-muted-foreground">Haberlerine henüz yorum yapılmadı.</li>}
          {latestComments.map((c) => (
            <li key={c.id} className="px-4 py-3 min-w-0">
              <p className="text-sm line-clamp-2">{c.content}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                <strong>{c.user.name}</strong> · <Link href={`/article/${c.article.slug}`} className="hover:text-primary-500">{c.article.title}</Link> · {formatRelativeTime(c.createdAt, { compact: true })}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
