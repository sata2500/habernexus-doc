import { notFound } from "next/navigation";
import Image from "next/image";
import { getArticleBySlug } from "@/lib/data";
import { formatDateTime, formatViewCount, getAppUrl, readingMinutes } from "@/lib/utils";
import { plainText } from "@/lib/analysis/metrics";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Clock, Eye, Calendar, Sparkles } from "lucide-react";
import { NewsArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { BookmarkButton } from "../components/BookmarkButton";
import { ViewTracker } from "../components/ViewTracker";
import { ShareButtons } from "../components/ShareButtons";
import { CommentSection } from "../components/comments/CommentSection";
import { AudioPlayer } from "../components/AudioPlayer";
import { TldrCard } from "../components/TldrCard";
import { getStoredSummary } from "@/lib/tldr";
import { stripLeadingTitleHeading } from "@/lib/article-content";
import { firstParagraphText, normalizeMetaDescription } from "@/lib/news/seo-text";
import { ReadingProgressBar } from "../components/ReadingProgressBar";
import { ArticleReactions } from "../components/ArticleReactions";
import { ReadingProgressTracker } from "../components/ReadingProgressTracker";
import { NewsletterInline } from "@/components/article/NewsletterInline";
import { FeedArticleCard } from "@/components/article/FeedArticleCard";
import { getRelatedArticles } from "@/lib/feed";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/server/sanitize-html";
import { ARTICLE_COVER_BLUR_DATA_URL } from "@/lib/image-placeholder";

export const revalidate = 3600; // 1 saatte bir arka planda yenile (ISR)

// Async Params Arayüzü (Next.js 15/16 Zorunluluğu)
type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
      orderBy: { publishedAt: "desc" },
      take: 100, // En güncel 100 haberi build anında üret
    });

    return articles.map((article) => ({
      slug: article.slug,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) return { title: "Haber bulunamadı", robots: { index: false, follow: true } };

  const isPublished = article.status === "PUBLISHED";
  // Spot yoksa ya da kısaysa gövdenin ilk paragrafından tamamlanır (başlığın tekrarı yerine)
  const description = normalizeMetaDescription(
    article.excerpt || "",
    firstParagraphText(stripLeadingTitleHeading(article.title, article.content)),
  ) || article.title;
  const images = article.coverImage ? [{ url: article.coverImage, alt: article.title }] : [];

  return {
    title: article.title,
    description,
    alternates: {
      canonical: `/article/${slug}`,
    },
    robots: isPublished
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" as const, "max-snippet": -1, "max-video-preview": -1 } }
      : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      images,
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt?.toISOString(),
      section: article.category?.name,
      authors: [article.author.name],
      tags: article.tags?.map((t) => t.tag.name),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images,
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Gövdenin başında başlığın tekrarı varsa gösterme (eski yapay zekâ haberleri)
  const body = stripLeadingTitleHeading(article.title, article.content);
  const readTime = readingMinutes(article.content);
  const [related, storedSummary] = await Promise.all([
    getRelatedArticles({
      id: article.id,
      categoryId: article.categoryId,
      tagIds: article.tags.map((t) => t.tag.id),
    }),
    // Daha önce üretilmiş özet varsa sayfayla birlikte gelir, tıklayınca beklemeden açılır
    getStoredSummary(article),
  ]);

  // JSON-LD için kelime sayısı (HTML etiketleri sayılmaz)
  const wordCount = plainText(body).split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Canlı Okuma İlerleme Çubuğu ────────────────────────── */}
      <ReadingProgressBar estimatedMinutes={readTime} />

      {/* ── SEO: Structured Data ────────────────────────── */}
      <NewsArticleJsonLd
        title={article.title}
        description={normalizeMetaDescription(article.excerpt || "", firstParagraphText(body)) || article.title}
        slug={article.slug}
        coverImage={article.coverImage}
        datePublished={article.publishedAt}
        dateModified={article.updatedAt}
        authorName={article.aiPersona?.name || article.author.name}
        authorImage={article.aiPersona?.image || article.author.image}
        categoryName={article.category?.name}
        tags={article.tags?.map((t) => t.tag.name)}
        wordCount={wordCount}
      />
      <BreadcrumbJsonLd
        items={[
          ...(article.category
            ? [
                {
                  name: article.category.name,
                  href: `/category/${article.category.slug}`,
                },
              ]
            : []),
          { name: article.title, href: `/article/${article.slug}` },
        ]}
      />

      <ViewTracker articleId={article.id} />

      {/* ── Üst Bilgi ve Başlık Alanı ────────────────────────── */}
      <header className="mb-8 space-y-6 text-center lg:text-left">
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
          {article.category && (
            <Badge
              variant="outline"
              style={{
                color: article.category.color || "currentColor",
                borderColor: article.category.color || "currentColor",
              }}
            >
              {article.category.name}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {article.publishedAt ? (
              <time dateTime={article.publishedAt.toISOString()}>
                {formatDateTime(article.publishedAt)}
              </time>
            ) : (
              "Belirsiz"
            )}
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {readTime} dk okuma
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Eye className="h-4 w-4" aria-hidden="true" />
            {formatViewCount(article.viewCount)} görüntülenme
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display leading-tight tracking-tight">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-lg text-muted-foreground md:text-xl font-medium leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Dar ekranda paylaşım düğmeleri alt satıra geçer, yazar adı bölünmez */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-b border-border py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={(article.aiPersona?.image || article.author?.image) || undefined}
              fallback={article.aiPersona?.name || article.author?.name || "Yazar"}
              size="md"
            />
            <div className="text-left">
              <p className="font-semibold whitespace-nowrap">{article.aiPersona?.name || article.author?.name || "Bilinmeyen Yazar"}</p>
              <p className="text-sm text-muted-foreground">{article.aiPersona?.role || "Yazar"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            <ShareButtons title={article.title} url={`${getAppUrl()}/article/${article.slug}`} />
            <BookmarkButton articleId={article.id} />
          </div>
        </div>
      </header>

      {/* ── Yapay Zekâ ile Hızlı Özet & Sesli Dinleme ────────────────── */}
      <div className="mb-10 space-y-4">
        <TldrCard articleId={article.id} content={body} initialBullets={storedSummary} />
        <AudioPlayer articleId={article.id} content={body} title={article.title} />
      </div>

      {/* ── Kapak Resmi Görüntüleyicisi ────────────────────────── */}
      {article.coverImage && (
        <div className="w-full aspect-video md:aspect-21/9 bg-muted rounded-2xl overflow-hidden mb-12 relative shadow-lg">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover"
            priority
            fetchPriority="high"
            placeholder="blur"
            blurDataURL={ARTICLE_COVER_BLUR_DATA_URL}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
          />
        </div>
      )}

      {/* ── Ana İçerik Gövdesi (Typography Plugin) ────────────────────────── */}
      <ReadingProgressTracker articleId={article.id} slug={article.slug} title={article.title} coverImage={article.coverImage} category={article.category?.name ?? null} />
      <article id="article-body" className="prose prose-lg dark:prose-invert prose-blue mx-auto w-full mb-12">
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />
      </article>

      {/* ── Okuyucu Reaksiyon & Düşünce Modülü ────────────────── */}
      {/* Okuma ölçümünde haberin sonu: tepkiler bölümü görününce haber "okundu" sayılır */}
      <div id="article-end">
        <ArticleReactions articleId={article.id} />
      </div>

      {/* ── Yazar Bilgi Kartı ────────────────────────── */}
      <section className="bg-muted/30 rounded-2xl p-6 md:p-8 mb-12 border border-border" aria-label="Yazar hakkında">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <Avatar
            src={(article.aiPersona?.image || article.author.image) || undefined}
            fallback={article.aiPersona?.name || article.author.name}
            size="lg"
            className="ring-4 ring-background"
          />
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-bold font-display">{article.aiPersona?.name || article.author.name}</h2>
              <p className="text-sm text-primary-600 font-medium">{article.aiPersona?.role || "Haber Nexus Yazarı"}</p>
            </div>
            {(article.aiPersona?.description || article.author.bio) ? (
              <p className="text-muted-foreground leading-relaxed">
                {article.aiPersona?.description || article.author.bio}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Bu yazar henüz bir biyografi eklememiş.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Etiketler: etiket sayfalarına bağlanır ────────────────────────── */}
      {article.tags.length > 0 && (
        <nav className="flex flex-wrap items-center gap-2 border-t border-border pt-6 mt-8 mb-8" aria-label="Etiketler">
          <span className="font-semibold font-display">Etiketler:</span>
          {article.tags.map((tagRel) => (
            <Link key={tagRel.tag.id} href={`/etiket/${tagRel.tag.slug}`}>
              <Badge variant="default" className="hover:bg-primary-500 hover:text-white transition-colors">#{tagRel.tag.name}</Badge>
            </Link>
          ))}
        </nav>
      )}

      {/* ── Yapay Zeka Yorum Özeti ────────────────────────── */}
      {(() => {
        const report = typeof article.analysisReport === "object" && article.analysisReport !== null && !Array.isArray(article.analysisReport)
          ? article.analysisReport as Record<string, unknown>
          : null;
        const summary = typeof report?.commentsSummary === "string" ? report.commentsSummary : null;
        if (!summary) return null;

        return (
          <div className="mb-10 p-6 glass-strong rounded-3xl border border-primary-500/10 shadow-soft relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-500/5 blur-2xl -z-10" />
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold font-display">
                Yapay Zekâ Okur Özeti
              </h2>
            </div>
            <div
              className="prose prose-sm dark:prose-invert prose-primary max-w-none text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary) }}
            />
          </div>
        );
      })()}

      {/* ── İlgili haberler ────────────────────────── */}
      {related.length > 0 && (
        <section aria-labelledby="related-title" className="mb-12">
          <h2 id="related-title" className="text-xl font-bold font-display mb-4">Bunlar da ilginizi çekebilir</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((a) => <FeedArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}

      <NewsletterInline />

      {/* ── Yorum Sistemi ────────────────────────── */}
      <CommentSection articleId={article.id} />
    </div>
  );
}
