import Link from "next/link";
import {
  TrendingUp,
  Clock,
  ArrowRight,
  Eye,
  Flame,
  Zap,
  Newspaper,
    Sparkles

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
  getRecommendedArticles,
} from "@/lib/data";
import Image from "next/image";
import { cn, getCardGlowStyles } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

import { HomepageSlider } from "@/components/layout/HomepageSlider";

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
  const latestArticles = await getLatestArticles(8);
  const categories = await getCategoriesWithCount();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  // Sadece giriş yapılmışsa kişiselleştirilmiş öneriler çek
  const recommendedArticles = userId
    ? await getRecommendedArticles(userId, 6)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4 md:pt-6 space-y-12">
      {/* ── Slider Section ────────────────────────── */}
      <HomepageSlider />

      {/* ── Hero Section ────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="hero-section" aria-label="Öne Çıkan Haberler">
        {/* Main Hero */}
        <div className="lg:col-span-2">
          {heroArticle ? (
            <Link href={`/article/${heroArticle.slug}`} className="group block h-full">
              <Card
                variant="interactive"
                noPadding
                className="overflow-hidden h-full shine rounded-2xl card-360-border transition-all duration-300 ease-out"
                style={getCardGlowStyles(heroArticle.category?.color)}
              >
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
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-transparent" />
                  <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 items-center">
                    <Badge variant="error" className="animate-pulse-glow">
                      <Zap className="h-3 w-3 mr-1" />
                      Son Dakika
                    </Badge>
                    {heroArticle.category && (
                      <Badge
                        className="text-white border-white/30 backdrop-blur-md bg-white/10"
                        variant="outline"
                        style={{ borderColor: heroArticle.category.color || "#fff", color: heroArticle.category.color || "#fff" }}
                      >
                        {heroArticle.category.name}
                      </Badge>
                    )}
                  </div>

                  <div className="relative z-10 p-6 md:p-8 text-white space-y-3.5">
                    <h1 className="sr-only">Haber Nexus — Türkiye ve Dünya Gündeminden Son Dakika Haberler</h1>
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight group-hover:text-[var(--art-color)] transition-colors duration-300">
                      {heroArticle.title}
                    </h2>
                    {heroArticle.excerpt && (
                      <p className="text-white/80 text-sm md:text-base line-clamp-2 max-w-2xl">
                        {heroArticle.excerpt}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-white/60 pt-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={(heroArticle.aiPersona?.image || heroArticle.author.image) || undefined}
                          fallback={heroArticle.aiPersona?.name || heroArticle.author.name}
                          size="xs"
                          className="ring-2 ring-[var(--art-color)]"
                        />
                        <span className="font-medium text-white/80">{heroArticle.aiPersona?.name || heroArticle.author.name}</span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {estimateReadingTime(heroArticle.content)} dk okuma
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {formatCount(heroArticle.viewCount)} okuma
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
          <Card className="h-full border border-border/40 bg-card/60 backdrop-blur-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="h-9 w-9 rounded-xl bg-accent-500/10 flex items-center justify-center">
                  <Flame className="h-4.5 w-4.5 text-accent-500" />
                </div>
                <h2 className="text-lg font-bold font-display tracking-tight">
                  Trend Haberler
                </h2>
              </div>
              {trendingArticles.length > 0 ? (
                <div className="space-y-3.5">
                  {trendingArticles.map((article, index: number) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="group block"
                    >
                      <div
                        className="p-3.5 rounded-xl border border-border/40 bg-card/30 hover:bg-card hover:border-[var(--art-color)] hover:shadow-[0_0_20px_var(--art-glow)] transition-all duration-300 ease-out flex gap-3.5 items-center hover:-translate-y-0.5"
                        style={getCardGlowStyles(article.category?.color)}
                      >
                        <span className="text-xl font-bold font-display text-muted-foreground/30 group-hover:text-[var(--art-color)] transition-colors duration-300 min-w-6 text-center">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            {article.category && (
                              <span
                                className="text-[10px] font-bold tracking-wider uppercase"
                                style={{ color: article.category.color || "var(--color-primary-500)" }}
                              >
                                {article.category.name}
                              </span>
                            )}
                            {article.publishedAt && (
                              <span className="text-[10px] text-muted-foreground/80">
                                {formatRelative(article.publishedAt)}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold leading-snug line-clamp-2 text-card-foreground group-hover:text-primary-500 transition-colors duration-300">
                            {article.title}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />
                              {formatCount(article.viewCount)} okuma
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Trend makale yok.</p>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* ── Categories Bar ────────────────────────── */}
      <section id="categories-section" aria-label="Kategoriler">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-display tracking-tight">Kategoriler</h2>
          <Link
            href="/categories"
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 transition-colors group/all"
          >
            Tümünü Gör <ArrowRight className="h-4 w-4 group-hover/all:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.slice(0, 12).map((cat) => {
            return (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="group block">
                <div
                  className="relative flex flex-col items-center gap-2.5 text-center py-6 px-3 card-360-border bg-card/60 backdrop-blur-xs hover:bg-card hover:-translate-y-1 transition-all duration-300 ease-out rounded-2xl cursor-pointer"
                  style={getCardGlowStyles(cat.color)}
                >
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_12px_var(--cat-glow)]"
                    style={{ backgroundColor: `${cat.color || "#888"}12` }}
                  >
                    <DynamicIcon name={cat.icon} fallback={Newspaper} className="h-5.5 w-5.5 transition-colors duration-300" style={{ color: cat.color || "#888" }} />
                  </div>
                  <span className="text-sm font-bold tracking-tight text-card-foreground group-hover:text-[var(--cat-color)] transition-colors duration-300">
                    {cat.name}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground group-hover:bg-[var(--cat-glow)] group-hover:text-[var(--cat-color)] transition-all duration-300">
                    {cat._count.articles} haber
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Latest Articles Grid ────────────────────────── */}
      <section id="latest-articles-section" aria-label="Son Haberler">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-500" />
            </div>
            <h2 className="text-xl font-bold font-display tracking-tight">Son Haberler</h2>
          </div>
          <Link
            href="/latest"
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 transition-colors group/all"
          >
            Tümünü Gör <ArrowRight className="h-4 w-4 group-hover/all:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestArticles.map((article, index: number) => {
            const isFirst = index === 0;
            return (
              <Link
                key={article.id}
                href={`/article/${article.slug}`}
                className={cn("group block", isFirst && "md:col-span-2 lg:col-span-2")}
              >
                <Card
                  variant="interactive"
                  noPadding
                  className={cn(
                    "overflow-hidden h-full flex flex-col shine rounded-2xl card-360-border bg-card/65 hover:bg-card transition-all duration-300 ease-out",
                    isFirst && "md:flex-row"
                  )}
                  style={getCardGlowStyles(article.category?.color)}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden bg-muted",
                      isFirst ? "h-48 md:h-full md:w-1/2 shrink-0" : "h-48"
                    )}
                  >
                    {article.coverImage ? (
                      <Image
                        src={article.coverImage}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-750"
                        sizes={isFirst ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${article.category?.color || "#888"}25, ${article.category?.color || "#888"}08)`,
                        }}
                      >
                        <Newspaper className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {article.category && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge
                          variant="default"
                          className="backdrop-blur-md bg-card/85 text-xs font-bold"
                          style={{ color: article.category.color || "inherit" }}
                        >
                          {article.category.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-6 flex flex-col flex-1 justify-between">
                    <div className="space-y-2.5">
                      <h3 className={cn(
                        "font-bold font-display leading-snug group-hover:text-[var(--art-color)] transition-colors duration-300 line-clamp-2",
                        isFirst ? "text-lg md:text-xl lg:text-2xl" : "text-base"
                      )}>
                        {article.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-3 leading-relaxed">
                        {article.excerpt || "Devamını okumak için tıklayın..."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border mt-4">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={(article.aiPersona?.image || article.author.image) || undefined}
                          fallback={article.aiPersona?.name || article.author.name}
                          size="xs"
                          className="ring-2 ring-[var(--art-color)]/70"
                        />
                        <span className="font-medium">{article.aiPersona?.name || article.author.name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="h-3.5 w-3.5" />
                          {estimateReadingTime(article.content)} dk
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Eye className="h-3.5 w-3.5" />
                          {formatCount(article.viewCount)}
                        </span>
                        {article.publishedAt && (
                          <span className="flex items-center gap-1 shrink-0 text-muted-foreground/80">
                            • {formatRelative(article.publishedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Sizin İçin Section (sadece giriş yapılmışsa) ────────────────────────── */}
      {userId && recommendedArticles.length > 0 && (
        <section id="recommended-articles-section" aria-label="Sizin İçin Seçilenler">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-accent-500/10 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-accent-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display tracking-tight">Sizin İçin</h2>
                <p className="text-xs text-muted-foreground">İlgi alanlarınıza göre seçilenler</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedArticles.map((article) => (
              <Link key={article.id} href={`/article/${article.slug}`} className="group block">
                <Card
                  variant="interactive"
                  noPadding
                  className="overflow-hidden h-full flex flex-col shine rounded-2xl card-360-border bg-card/65 hover:bg-card transition-all duration-300 ease-out"
                  style={getCardGlowStyles(article.category?.color)}
                >
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {article.coverImage ? (
                      <Image
                        src={article.coverImage}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-primary-500/10 to-primary-700/5">
                        <Newspaper className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    {article.category && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge variant="default" className="backdrop-blur-md bg-card/85 text-xs font-bold" style={{ color: article.category.color || "inherit" }}>
                          {article.category.name}
                        </Badge>
                      </div>
                    )}
                    {/* Kişiselleştirilmiş rozet */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-500/20 text-accent-500 border border-accent-500/30 backdrop-blur-md">
                        <Sparkles className="h-2.5 w-2.5" /> Sizin için
                      </span>
                    </div>
                  </div>
                  <div className="p-4.5 flex flex-col justify-between flex-grow">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-sm font-display line-clamp-2 leading-snug group-hover:text-[var(--art-color)] transition-colors duration-300">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Avatar
                          src={(article.aiPersona?.image || article.author.image) || undefined}
                          fallback={article.aiPersona?.name || article.author.name}
                          size="xs"
                          className="w-4.5 h-4.5 ring-1 ring-[var(--art-color)]/70 shrink-0"
                        />
                        <span className="font-medium truncate max-w-[90px]">{article.aiPersona?.name || article.author.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {estimateReadingTime(article.content)} dk
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}




      {/* ── CTA Section ────────────────────────── */}
      <section id="cta-section" aria-label="Kayıt Çağrısı">
        <Card
          variant="glass"
          className="bg-gradient-hero text-center py-12 px-6 md:px-16 relative overflow-hidden"
        >
          <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-primary-500/5 blur-2xl" />
          <div className="absolute bottom-4 left-4 w-32 h-32 rounded-full bg-accent-500/5 blur-2xl" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight mb-3">
              Haberleri <span className="text-gradient">Kaçırmayın</span>
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {userId
                ? "Bülten aboneliğinizi, bildirimlerinizi ve haber tercihlerinizi profil sayfanızdan dilediğiniz zaman yönetebilirsiniz."
                : "Gündemdeki en önemli gelişmeleri kişiselleştirilmiş haber akışınızla takip edin. Ücretsiz üye olun."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {userId ? (
                <Link href="/dashboard/settings">
                  <button className="h-12 px-8 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow cursor-pointer">
                    Bülten & Tercihlerimi Yönet
                  </button>
                </Link>
              ) : (
                <Link href="/register">
                  <button className="h-12 px-8 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow cursor-pointer">
                    Ücretsiz Kaydol
                  </button>
                </Link>
              )}
              <Link href="/about">
                <button className="h-12 px-8 rounded-xl border border-border text-foreground font-semibold hover:bg-muted hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
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
