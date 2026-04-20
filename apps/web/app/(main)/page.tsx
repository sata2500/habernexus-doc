import Link from "next/link";
import {
  TrendingUp,
  Clock,
  ArrowRight,
  Eye,
  Flame,
  Zap,
  Newspaper,
  Globe,
  Cpu,
  Trophy,
  TrendingDown,
  Heart,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import {
  getHeroArticle,
  getTrendingArticles,
  getLatestArticles,
  getCategoriesWithCount,
  estimateReadingTime,
} from "@/lib/data";
import Image from "next/image";

const IconMap: Record<string, LucideIcon> = {
  Newspaper,
  Globe,
  TrendingDown,
  TrendingUp,
  Cpu,
  Trophy,
  Heart,
  Flame,
  Zap,
};

/* ============================================
   Helper
   ============================================ */
function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  return `${diffDays} gün önce`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

/* ============================================
   Page Component (RSC - Server Component)
   ============================================ */
export default async function HomePage() {
  const heroArticle = await getHeroArticle();
  const trendingArticles = await getTrendingArticles(4);
  const latestArticles = await getLatestArticles(6);
  const categories = await getCategoriesWithCount();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* ── Hero Section ────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="hero-section" aria-label="Öne Çıkan Haberler">
        {/* Main Hero */}
        <div className="lg:col-span-2">
          {heroArticle ? (
            <Link href={`/article/${heroArticle.slug}`} className="group block h-full">
              <Card variant="interactive" noPadding className="overflow-hidden h-full">
                <div className="relative h-full min-h-[300px] md:min-h-[400px] bg-linear-to-br from-primary-500/20 via-accent-500/10 to-primary-700/20 flex items-end">
                  {heroArticle.coverImage && (
                    <Image
                      src={heroArticle.coverImage}
                      alt={heroArticle.title}
                      fill
                      priority
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute top-4 left-4 z-10">
                    <Badge variant="error" className="animate-pulse-glow">
                      <Zap className="h-3 w-3 mr-1" />
                      Son Dakika
                    </Badge>
                  </div>
                  <div className="relative z-10 p-6 md:p-8 text-white space-y-3">
                    {heroArticle.category && (
                      <Badge
                        className="text-white border-white/30"
                        variant="outline"
                        style={{ borderColor: heroArticle.category.color || "#fff" }}
                      >
                        {heroArticle.category.name}
                      </Badge>
                    )}
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-(family-name:--font-outfit) leading-tight group-hover:text-primary-200 transition-colors">
                      {heroArticle.title}
                    </h2>
                    {heroArticle.excerpt && (
                      <p className="text-white/80 text-sm md:text-base line-clamp-2 max-w-2xl">
                        {heroArticle.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={(heroArticle.aiPersona?.image || heroArticle.author.image) || undefined}
                          fallback={heroArticle.aiPersona?.name || heroArticle.author.name}
                          size="xs"
                        />
                        <span>{heroArticle.aiPersona?.name || heroArticle.author.name}</span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {estimateReadingTime(heroArticle.content)} dk okuma
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {formatCount(heroArticle.viewCount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground">Makale bulunamadı.</p>
            </Card>
          )}
        </div>

        {/* Trending Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
                <Flame className="h-4 w-4 text-accent-500" />
              </div>
              <h2 className="text-lg font-bold font-(family-name:--font-outfit)">
                Trend Haberler
              </h2>
            </div>
            {trendingArticles.length > 0 ? (
              <div className="space-y-4">
                {trendingArticles.map((article, index: number) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="group flex gap-3 items-start"
                  >
                    <span className="text-2xl font-bold font-(family-name:--font-outfit) text-muted-foreground/40 group-hover:text-primary-500 transition-colors min-w-8">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      {article.category && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                          style={{
                            color: article.category.color || "currentColor",
                            borderColor: `${article.category.color || "#ccc"}40`,
                          }}
                        >
                          {article.category.name}
                        </Badge>
                      )}
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {article.publishedAt && (
                          <span>{formatRelative(article.publishedAt)}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatCount(article.viewCount)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Trend makale yok.</p>
            )}
          </Card>
        </div>
      </section>

      {/* ── Categories Bar ────────────────────────── */}
      <section id="categories-section" aria-label="Kategoriler">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-(family-name:--font-outfit)">Kategoriler</h2>
          <Link
            href="/categories"
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 transition-colors"
          >
            Tümünü Gör <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const IconComponent = cat.icon && IconMap[cat.icon] ? IconMap[cat.icon] : Newspaper;
            return (
              <Link key={cat.slug} href={`/category/${cat.slug}`}>
                <Card
                  variant="interactive"
                  className="flex flex-col items-center gap-2 text-center py-5 px-3"
                >
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${cat.color || "#888"}15` }}
                  >
                    <IconComponent className="h-5 w-5" style={{ color: cat.color || "#888" }} />
                  </div>
                  <span className="text-sm font-semibold">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cat._count.articles} haber
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Latest Articles Grid ────────────────────────── */}
      <section id="latest-articles-section" aria-label="Son Haberler">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary-500" />
            </div>
            <h2 className="text-xl font-bold font-(family-name:--font-outfit)">Son Haberler</h2>
          </div>
          <Link
            href="/latest"
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 transition-colors"
          >
            Tümünü Gör <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestArticles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group">
              <Card variant="interactive" noPadding className="overflow-hidden h-full flex flex-col">
                <div className="h-48 relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {article.coverImage ? (
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${article.category?.color || "#888"}25, ${article.category?.color || "#888"}08)`,
                      }}
                    />
                  )}
                  {!article.coverImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Newspaper className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  {article.category && (
                    <div className="absolute top-3 left-3">
                      <Badge
                        variant="default"
                        className="backdrop-blur-md bg-white/80 dark:bg-black/50 text-xs"
                        style={{ color: article.category.color || "#fff" }}
                      >
                        {article.category.name}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-base font-semibold font-(family-name:--font-outfit) leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {article.excerpt || "Devamını okumak için tıklayın..."}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={(article.aiPersona?.image || article.author.image) || undefined}
                        fallback={article.aiPersona?.name || article.author.name}
                        size="xs"
                      />
                      <span>{article.aiPersona?.name || article.author.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {estimateReadingTime(article.content)} dk
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatCount(article.viewCount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA Section ────────────────────────── */}
      <section id="cta-section" aria-label="Kayıt Çağrısı">
        <Card
          variant="glass"
          className="bg-gradient-hero text-center py-12 px-6 md:px-16 relative overflow-hidden"
        >
          <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-primary-500/5 blur-2xl" />
          <div className="absolute bottom-4 left-4 w-32 h-32 rounded-full bg-accent-500/5 blur-2xl" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold font-(family-name:--font-outfit) mb-3">
              Haberleri <span className="text-gradient">Kaçırmayın</span>
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Gündemdeki en önemli gelişmeleri kişiselleştirilmiş haber akışınızla
              takip edin. Ücretsiz üye olun.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <button className="h-12 px-8 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 transition-opacity shadow-glow cursor-pointer">
                  Ücretsiz Kaydol
                </button>
              </Link>
              <Link href="/about">
                <button className="h-12 px-8 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors cursor-pointer">
                  Daha Fazla Bilgi
                </button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
