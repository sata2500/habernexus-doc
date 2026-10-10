import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { feedSelect, toFeedArticle } from "@/lib/feed";
import { FeedArticleCard } from "@/components/article/FeedArticleCard";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const revalidate = 1800;

const PAGE_SIZE = 18;
/** Bu sayıdan az haberi olan etiket sayfaları dizine eklenmez (zayıf içerik sayılmasın) */
const MIN_INDEXABLE = 2;

type Params = Promise<{ slug: string }>;
type Search = Promise<{ sayfa?: string }>;

const getTag = cache(async (slug: string) =>
  prisma.tag
    .findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, _count: { select: { articles: { where: { article: { status: "PUBLISHED" } } } } } },
    })
    .catch(() => null),
);

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const tag = await getTag(slug);
  if (!tag) return { title: "Etiket bulunamadı", robots: { index: false } };
  const pageNo = Math.max(1, Math.floor(Number((await searchParams).sayfa)) || 1);
  const count = tag._count.articles;
  return {
    title: `${tag.name} Haberleri${pageNo > 1 ? ` – Sayfa ${pageNo}` : ""}`,
    description: `${tag.name} ile ilgili son dakika gelişmeleri, güncel haberler ve analizler. ${count} haber.`,
    alternates: { canonical: pageNo > 1 ? `/etiket/${slug}?sayfa=${pageNo}` : `/etiket/${slug}` },
    robots: count >= MIN_INDEXABLE ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function TagPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const tag = await getTag(slug);
  if (!tag || tag._count.articles === 0) notFound();
  const pageNo = Math.max(1, Math.floor(Number((await searchParams).sayfa)) || 1);
  const pages = Math.max(1, Math.ceil(tag._count.articles / PAGE_SIZE));
  if (pageNo > pages) notFound();

  const rows = await prisma.article.findMany({
    where: { status: "PUBLISHED", tags: { some: { tagId: tag.id } } },
    orderBy: { publishedAt: "desc" },
    skip: (pageNo - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: feedSelect,
  });
  const articles = rows.map(toFeedArticle);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      <BreadcrumbJsonLd items={[{ name: `${tag.name} Haberleri`, href: `/etiket/${tag.slug}` }]} />
      <header className="space-y-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-500">
          <Hash className="h-3.5 w-3.5" /> Etiket
        </p>
        <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight">{tag.name} Haberleri</h1>
        <p className="text-muted-foreground">
          {tag.name} ile ilgili en güncel gelişmeler · {tag._count.articles} haber
        </p>
      </header>

      <h2 className="sr-only">Haber listesi</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {articles.map((a, i) => <FeedArticleCard key={a.id} article={a} priority={i < 2} />)}
      </div>

      {pages > 1 && (
        <nav aria-label="Sayfalar" className="flex items-center justify-center gap-2 text-sm">
          {pageNo > 1 && (
            <Link href={pageNo === 2 ? `/etiket/${tag.slug}` : `/etiket/${tag.slug}?sayfa=${pageNo - 1}`} rel="prev" className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-border hover:bg-muted">
              <ChevronLeft className="h-4 w-4" /> Önceki
            </Link>
          )}
          <span className="text-muted-foreground tabular-nums">{pageNo} / {pages}</span>
          {pageNo < pages && (
            <Link href={`/etiket/${tag.slug}?sayfa=${pageNo + 1}`} rel="next" className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-border hover:bg-muted">
              Sonraki <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
