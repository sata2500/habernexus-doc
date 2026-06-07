import { notFound } from "next/navigation";
import { getCategoryWithArticles, estimateReadingTime } from "@/lib/data";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, Eye, Newspaper } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import Image from "next/image";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

// Async Params Arayüzü
type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const category = await getCategoryWithArticles(slug);

  if (!category) return { title: "Kategori Bulunamadı | Haber Nexus" };

  return {
    title: `${category.name} Haberleri`,
    description: category.description || `${category.name} kategorisindeki en güncel gelişmeler Haber Nexus'ta.`,
    alternates: {
      canonical: `/category/${slug}`,
    },
  };
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = await getCategoryWithArticles(slug);

  if (!category) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* SEO: Breadcrumb Structured Data */}
      <BreadcrumbJsonLd
        items={[{ name: `${category.name} Haberleri`, href: `/category/${category.slug}` }]}
      />

      {/* ── Kategori Başlığı ────────────────────────── */}
      <div className="flex flex-col items-center justify-center text-center mb-16 mt-8 space-y-4">
        <div
          className="h-20 w-20 rounded-2xl flex items-center justify-center mb-2 shadow-[0_0_30px_var(--cat-glow)] border border-[var(--cat-color)]/30 bg-card/60 backdrop-blur-xs animate-pulse-glow"
          style={{
            "--cat-color": category.color || "var(--color-primary-500)",
            "--cat-glow": `${category.color || "var(--color-primary-500)"}18`
          } as React.CSSProperties}
        >
          <DynamicIcon name={category.icon} fallback={Newspaper} className="h-10 w-10 transition-colors duration-300" style={{ color: category.color || "var(--color-primary-500)" }} />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight">
          {category.name} Haberleri
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {category.description || `${category.name} ile ilgili son dakika gelişmelerini ve analizleri anında takip edin.`}
        </p>
      </div>

      {/* ── Haber Grid (Listeleme) ────────────────────────── */}
      {category.articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {category.articles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group block shine rounded-2xl">
              <Card 
                variant="interactive" 
                noPadding 
                className="overflow-hidden h-full flex flex-col border border-border/40 bg-card/65 hover:bg-card hover:border-[var(--cat-color)] hover:shadow-[0_0_25px_var(--cat-glow)] transition-all duration-300"
                style={{
                  "--cat-color": category.color || "var(--color-primary-500)",
                  "--cat-glow": `${category.color || "var(--color-primary-500)"}12`
                } as React.CSSProperties}
              >
                <div className="h-48 relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {article.coverImage ? (
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-750"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${category.color || "#888"}25, ${category.color || "#888"}08)`,
                      }}
                    />
                  )}
                  {!article.coverImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Newspaper className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge
                      variant="default"
                      className="backdrop-blur-md bg-card/85 text-xs font-bold"
                      style={{ color: category.color || "inherit" }}
                    >
                      {category.name}
                    </Badge>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-base font-bold font-display leading-snug mb-2 group-hover:text-[var(--cat-color)] transition-colors duration-300 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed">
                      {article.excerpt || "Devamını okumak için tıklayın..."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border mt-auto">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={(article.aiPersona?.image || article.author.image) || undefined}
                        fallback={article.aiPersona?.name || article.author.name}
                        size="xs"
                        className="ring-2 ring-[var(--cat-color)]/70"
                      />
                      <span className="font-semibold text-foreground">{article.aiPersona?.name || article.author.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {estimateReadingTime(article.content)} dk
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Eye className="h-3.5 w-3.5" />
                        {formatCount(article.viewCount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border mt-8">
          <Newspaper className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-bold font-display text-foreground">Henüz Haber Yok</h3>
          <p className="text-muted-foreground mt-2">Bu kategoriye henüz bir makale eklenmemiş.</p>
        </div>
      )}
    </div>
  );
}
