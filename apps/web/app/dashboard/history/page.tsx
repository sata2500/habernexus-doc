import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, History, Newspaper } from "lucide-react";
import { auth } from "@/lib/auth";
import { getCompletedReads, getUnfinishedReads, READ_HISTORY_PAGE_SIZE } from "@/lib/server/reading-history";
import { formatRelativeTime } from "@/lib/utils";
import { ClearHistoryButton, RemoveReadButton } from "./components";

export const metadata = { title: "Okuduklarım" };

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="relative h-14 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-muted flex items-center justify-center">
      {src ? <Image src={src} alt="" fill sizes="96px" className="object-cover" /> : <Newspaper className="h-5 w-5 text-muted-foreground/40" />}
    </span>
  );
}

export default async function ReadingHistoryPage({ searchParams }: { searchParams: Promise<{ sayfa?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const pageNo = Math.max(1, Number.parseInt((await searchParams).sayfa ?? "1", 10) || 1);

  const [unfinished, completed] = await Promise.all([
    pageNo === 1 ? getUnfinishedReads(session.user.id) : Promise.resolve([]),
    getCompletedReads(session.user.id, pageNo),
  ]);
  const pages = Math.max(1, Math.ceil(completed.total / READ_HISTORY_PAGE_SIZE));
  const empty = completed.total === 0 && unfinished.length === 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><History className="h-6 w-6 text-primary-500" /> Okuduklarım</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Sonuna kadar okuduğunuz haberler otomatik olarak burada listelenir. &quot;Sizin İçin&quot; önerileri de buna göre seçilir.
          </p>
        </div>
        {!empty && <ClearHistoryButton />}
      </div>

      {empty && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border">
          <span className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4"><BookOpen className="h-7 w-7 text-muted-foreground" /></span>
          <h2 className="text-lg font-semibold mb-1">Henüz okunan haber yok</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-5">Bir haberi tepkiler bölümüne kadar okuduğunuzda burada görünür.</p>
          <Link href="/" className="inline-flex items-center px-5 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold">Haberleri keşfet</Link>
        </div>
      )}

      {unfinished.length > 0 && (
        <section aria-labelledby="unfinished-title" className="space-y-3">
          <h2 id="unfinished-title" className="flex items-center gap-2 text-base font-bold font-display">
            <BookOpen className="h-5 w-5 text-primary-500" /> Yarım kalanlar
            <span className="text-xs font-medium text-muted-foreground">· kaldığınız yerden devam edin</span>
          </h2>
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {unfinished.map((r) => (
              <li key={r.article.id} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-card">
                <Link href={`/article/${r.article.slug}`} className="flex min-w-0 flex-1 items-center gap-3 group">
                  <Thumb src={r.article.coverImage} />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="block text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary-600">{r.article.title}</span>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <span className="block h-full rounded-full bg-primary-500" style={{ width: `${r.progress}%` }} />
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">%{r.progress}</span>
                    </span>
                  </span>
                </Link>
                <RemoveReadButton articleId={r.article.id} title={r.article.title} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {completed.total > 0 && (
        <section aria-labelledby="completed-title" className="space-y-3">
          <h2 id="completed-title" className="flex items-center gap-2 text-base font-bold font-display">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Okunan haberler
            <span className="text-xs font-medium text-muted-foreground tabular-nums">· {completed.total}</span>
          </h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
            {completed.items.map((r) => (
              <li key={r.article.id} className="flex items-center gap-2 p-2.5 sm:p-3">
                <Link href={`/article/${r.article.slug}`} className="flex min-w-0 flex-1 items-center gap-3 group">
                  <Thumb src={r.article.coverImage} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary-600">{r.article.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      {r.article.category && <span className="font-semibold" style={{ color: r.article.category.color ?? undefined }}>{r.article.category.name}</span>}
                      {r.completedAt && <span>{formatRelativeTime(r.completedAt)} okundu</span>}
                    </span>
                  </span>
                </Link>
                <RemoveReadButton articleId={r.article.id} title={r.article.title} />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label="Sayfalar" className="flex items-center justify-center gap-2 text-sm">
              {pageNo > 1 ? <Link href={`?sayfa=${pageNo - 1}`} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-border hover:bg-muted"><ChevronLeft className="h-4 w-4" /> Önceki</Link> : null}
              <span className="text-muted-foreground tabular-nums">{pageNo} / {pages}</span>
              {pageNo < pages ? <Link href={`?sayfa=${pageNo + 1}`} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-border hover:bg-muted">Sonraki <ChevronRight className="h-4 w-4" /></Link> : null}
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
