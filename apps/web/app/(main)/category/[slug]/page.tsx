import { notFound } from "next/navigation";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { getCategoryWithArticles } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { FeedArticleCard } from "@/components/article/FeedArticleCard";

// Kategori listesi 5 dakikada bir yenilenir (haber değişikliklerinde anında)
export const revalidate = 300;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const category = await getCategoryWithArticles(slug);

  if (!category) return { title: "Kategori bulunamadı", robots: { index: false, follow: true } };

  return {
    title: `${category.name} Haberleri`,
    description: category.description || `${category.name} kategorisindeki en güncel gelişmeler Haber Nexus'ta.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = await getCategoryWithArticles(slug);
  if (!category) notFound();

  const color = category.color || "var(--color-primary-500)";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-10">
      <BreadcrumbJsonLd items={[{ name: `${category.name} Haberleri`, href: `/category/${category.slug}` }]} />

      <header className="flex flex-col items-center justify-center text-center mt-4 space-y-4">
        <div
          className="h-20 w-20 rounded-2xl flex items-center justify-center mb-2 border bg-card/60"
          style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, boxShadow: `0 0 30px color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <DynamicIcon name={category.icon} fallback={Newspaper} className="h-10 w-10" style={{ color }} />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight">{category.name} Haberleri</h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {category.description || `${category.name} ile ilgili son gelişmeleri ve analizleri takip edin.`}
        </p>
      </header>

      {category.articles.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {category.articles.map((article, i) => (
            <li key={article.id}>
              <FeedArticleCard article={article} priority={i < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
          <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" aria-hidden="true" />
          <h2 className="text-xl font-bold font-display text-foreground">Henüz haber yok</h2>
          <p className="text-muted-foreground mt-2">Bu kategoride henüz yayımlanmış haber bulunmuyor.</p>
        </div>
      )}

      {category._count.articles > category.articles.length && (
        <div className="text-center">
          <Link href={`/latest?kategori=${category.slug}`} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-card font-semibold hover:bg-muted focus-ring">
            Tüm {category.name} haberleri ({category._count.articles})
          </Link>
        </div>
      )}
    </div>
  );
}
