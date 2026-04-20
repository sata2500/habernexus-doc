import { notFound } from "next/navigation";
import Image from "next/image";
import { getArticleBySlug, estimateReadingTime } from "@/lib/data";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Clock, Eye, Calendar } from "lucide-react";
import { NewsArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { BookmarkButton } from "../components/BookmarkButton";
import { ViewTracker } from "../components/ViewTracker";
import { ShareButtons } from "../components/ShareButtons";
import { CommentSection } from "../components/comments/CommentSection";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // 1 saatte bir arka planda yenile (ISR)

// Async Params Arayüzü (Next.js 15 Zorunluluğu)
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

  if (!article) return { title: "Makale Bulunamadı | Haber Nexus" };

  const isPublished = article.status === "PUBLISHED";

  return {
    title: article.title,
    description: article.excerpt || article.title,
    alternates: {
      canonical: `/article/${slug}`,
    },
    robots: isPublished ? "index, follow" : "noindex, nofollow",
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt || article.title,
      images: article.coverImage ? [article.coverImage] : [],
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt?.toISOString(),
      section: article.category?.name,
      authors: [article.author.name],
      tags: article.tags?.map((t) => t.tag.name),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt || article.title,
      images: article.coverImage ? [article.coverImage] : [],
    },
  };
}

// Tarih Formatlayıcı Yardımcı Fonksiyon
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const readTime = estimateReadingTime(article.content);


  // Kelime sayısını hesapla (JSON-LD wordCount için)
  const wordCount = article.content ? article.content.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── SEO: Structured Data ────────────────────────── */}
      <NewsArticleJsonLd
        title={article.title}
        description={article.excerpt || article.title}
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
      <header className="mb-10 space-y-6 text-center lg:text-left">
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
            <Calendar className="h-4 w-4" />
            {article.publishedAt ? (
              <time dateTime={article.publishedAt.toISOString()}>
                {formatDate(article.publishedAt)}
              </time>
            ) : (
              "Belirsiz"
            )}
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {readTime} dk okuma
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {article.viewCount} görüntülenme
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-(family-name:--font-outfit) leading-tight">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-lg text-muted-foreground md:text-xl font-medium">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-b border-border py-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={(article.aiPersona?.image || article.author.image) || undefined}
              fallback={article.aiPersona?.name || article.author.name}
              size="md"
            />
            <div className="text-left">
              <p className="font-semibold">{article.aiPersona?.name || article.author.name}</p>
              <p className="text-sm text-muted-foreground">{article.aiPersona?.role || "Yazar"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShareButtons title={article.title} url={""} />
            <BookmarkButton articleId={article.id} />
          </div>
        </div>
      </header>

      {/* ── Kapak Resmi Görüntüleyicisi ────────────────────────── */}
      {article.coverImage && (
        <div className="w-full aspect-video md:aspect-21/9 bg-neutral-100 dark:bg-neutral-800 rounded-2xl overflow-hidden mb-12 relative shadow-lg">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
          />
        </div>
      )}

      {/* ── Ana İçerik Gövdesi (Typography Plugin) ────────────────────────── */}
      <article className="prose prose-lg dark:prose-invert prose-blue mx-auto w-full mb-16">
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </article>

      {/* ── Yazar Bilgi Kartı ────────────────────────── */}
      <section className="bg-muted/30 rounded-2xl p-6 md:p-8 mb-12 border border-border">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <Avatar
            src={(article.aiPersona?.image || article.author.image) || undefined}
            fallback={article.aiPersona?.name || article.author.name}
            size="lg"
            className="ring-4 ring-background"
          />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-xl font-bold font-(family-name:--font-outfit)">{article.aiPersona?.name || article.author.name}</h3>
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
            <div className="pt-2 flex justify-center md:justify-start gap-4">
               {/* Gelecekte sosyal medya linkleri buraya gelebilir */}
            </div>
          </div>
        </div>
      </section>

      {/* ── Etiketler (Tags) Alanı ────────────────────────── */}
      {article.tags.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border pt-6 mt-8">
          <span className="font-semibold font-(family-name:--font-outfit)">Etiketler:</span>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tagRel) => (
              <Badge key={tagRel.tag.id} variant="default" className="hover:bg-primary-500 hover:text-white transition-colors cursor-pointer">
                #{tagRel.tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ── Yorum Sistemi ────────────────────────── */}
      <CommentSection articleId={article.id} />
    </div>
  );
}
