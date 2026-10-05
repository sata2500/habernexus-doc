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
  getCategoriesWithCount,
  estimateReadingTime,
} from "@/lib/data";
import Image from "next/image";
import { getCardGlowStyles, formatRelativeTime, formatViewCount } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { getFeedPage } from "@/lib/feed";
import { getPersonalizedFeed, parseReadHistory, READ_HISTORY_COOKIE } from "@/lib/recommendations";
import { ArticleFeed } from "@/components/article/ArticleFeed";
import { FeedArticleCard } from "@/components/article/FeedArticleCard";
import { DynamicIcon } from "@/components/ui/DynamicIcon";

import { HomepageSlider } from "@/components/layout/HomepageSlider";
import { ContinueReading } from "@/components/home/ContinueReading";
import { getUnfinishedReads } from "@/lib/server/reading-history";

/* ============================================
   Page Component (RSC - Server Component)
   ============================================ */
export default async function HomePage() {
  const [heroArticle, trendingArticles, categories, latestFeed, session, cookieStore] = await Promise.all([
    getHeroArticle(),
    getTrendingArticles(4),
    getCategoriesWithCount(),
    getFeedPage({ limit: 9 }),
    auth.api.getSession({ headers: await headers() }),
    cookies(),
  ]);
  const userId = session?.user?.id;

  // Hesapta yarım kalan haberler (diğer cihazlarda başlananlar dahil)
  const accountUnfinished = userId
    ? (await getUnfinishedReads(userId, 3)).map((r) => ({
        id: r.article.id,
        slug: r.article.slug,
        title: r.article.title,
        coverImage: r.article.coverImage,
        category: r.article.category?.name ?? null,
        progress: r.progress,
        at: r.updatedAt.getTime(),
      }))
    : [];

  // Giriş yapmış kullanıcılara her zaman, ziyaretçilere okuma geçmişi varsa göster
  const readIds = parseReadHistory(cookieStore.get(READ_HISTORY_COOKIE)?.value);
  const forYou = userId || readIds.length > 0
    ? await getPersonalizedFeed({
        userId,
        readIds,
        excludeIds: [heroArticle?.id, ...trendingArticles.map((a) => a.id)].filter((id): id is string => !!id),
        limit: 6,
      }).catch((e) => {
        console.error("getPersonalizedFeed error:", e);
        return { items: [], personalized: false };
      })
    : { items: [], personalized: false };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4 md:pt-6 space-y-12">
      {/* ── Slider Section ────────────────────────── */}
      <HomepageSlider />

      {/* ── Kaldığın yerden devam et (yalnızca bu cihazda yarım kalan haber varsa) ── */}
      <ContinueReading accountEntries={accountUnfinished} />

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
                        {formatViewCount(heroArticle.viewCount)} okuma
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
                                {formatRelativeTime(article.publishedAt, { compact: true })}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold leading-snug line-clamp-2 text-card-foreground group-hover:text-primary-500 transition-colors duration-300">
                            {article.title}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-3 w-3" />
                              {formatViewCount(article.viewCount)} okuma
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

      {/* ── Sizin İçin (kişiselleştirilmiş öneriler) ────────────────────────── */}
      {forYou.items.length > 0 && (
        <section id="recommended-articles-section" aria-label="Sizin İçin Seçilenler">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-accent-500/10 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-accent-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display tracking-tight">Sizin İçin</h2>
                <p className="text-xs text-muted-foreground">
                  {forYou.personalized
                    ? "Okuduklarınıza ve kaydettiklerinize göre seçildi"
                    : "Haber okudukça bu bölüm size göre şekillenir"}
                </p>
              </div>
            </div>
          </div>

          {/* Mobilde yatay kaydırmalı, büyük ekranda ızgara */}
          <div className="-mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar pb-1">
            {forYou.items.map((article) => (
              <div key={article.id} className="snap-start shrink-0 w-[78%] sm:w-auto">
                <FeedArticleCard article={article} layout="vertical" note={article.reasonLabel} />
              </div>
            ))}
          </div>
        </section>
      )}

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

      {/* ── Tüm Haberler (yayın tarihine göre, daha fazla yükle) ────────────────────────── */}
      <section id="latest-articles-section" aria-label="Son Haberler">
        <div className="flex items-center justify-between mb-5 md:mb-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display tracking-tight">Son Haberler</h2>
              <p className="text-xs text-muted-foreground">En yeniden en eskiye</p>
            </div>
          </div>
          <Link
            href="/latest"
            className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 py-2 transition-colors group/all"
          >
            Tümünü Gör <ArrowRight className="h-4 w-4 group-hover/all:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <ArticleFeed initialItems={latestFeed.items} initialCursor={latestFeed.nextCursor} mode="button" maxLoads={3} />
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
                <Link href="/dashboard/settings" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow">
                  Bülten & Tercihlerimi Yönet
                </Link>
              ) : (
                <Link href="/register" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow">
                  Ücretsiz Kaydol
                </Link>
              )}
              <Link href="/about" className="inline-flex items-center justify-center h-12 px-8 rounded-xl border border-border text-foreground font-semibold hover:bg-muted hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Daha Fazla Bilgi
                </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
