import { cache } from "react";
import { prisma } from "./prisma";
import { appCache } from "./cache";
import { feedSelect, toFeedArticle } from "./feed";

/** Herkese açık sayfalarda yazar için yalnızca bu alanlar çekilir (e-posta, rol vb. asla) */
const PUBLIC_AUTHOR = { id: true, name: true, image: true, bio: true } as const;

// Vercel build sürecinde veritabanı bağlantısı olmayabilir.
const isMissingDb = !process.env.DATABASE_URL;

// Kapak haberi
export const getHeroArticle = cache(async () => {
  if (isMissingDb) return null;
  return appCache.getOrSet("data:hero-article", 60, async () => {
    try {
      return await prisma.article.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        include: {
          category: true,
          author: { select: PUBLIC_AUTHOR },
          aiPersona: true,
        },
      });
    } catch (e) {
      console.error("getHeroArticle error:", e);
      return null;
    }
  });
});

// Trend haberler
export const getTrendingArticles = cache(async (limit: number = 4) => {
  if (isMissingDb) return [];
  return appCache.getOrSet(`data:trending:${limit}`, 60, async () => {
    try {
      const include = { category: true, author: { select: PUBLIC_AUTHOR }, aiPersona: true } as const;
      // "Trend": son 3 günün en çok okunanları (tüm zamanlar sıralaması eski haberleri hep üstte tutuyordu).
      // Yeterli haber yoksa pencere 14 güne, o da yetmezse tüm haberlere genişler.
      for (const days of [3, 14]) {
        const recent = await prisma.article.findMany({
          where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - days * 86_400_000) } },
          orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }],
          take: limit,
          include,
        });
        if (recent.length >= limit) return recent;
      }
      return await prisma.article.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ publishedAt: "desc" }],
        take: limit,
        include,
      });
    } catch (e) {
      console.error("getTrendingArticles error:", e);
      return [];
    }
  });
});

// Kategoriler ve onlara ait yayınlanmış makale sayısı
export const getCategoriesWithCount = cache(async () => {
  if (isMissingDb) return [];
  return appCache.getOrSet("data:categories-count", 300, async () => {
    try {
      return await prisma.category.findMany({
        include: {
          _count: {
            select: { articles: { where: { status: "PUBLISHED" } } },
          },
        },
        orderBy: {
          order: "asc", 
        },
      });
    } catch (e) {
      console.error("getCategoriesWithCount error:", e);
      return [];
    }
  });
});

// Tekil Makale Detayı Çekimi
export const getArticleBySlug = cache(async (slug: string) => {
  if (isMissingDb) return null;
  return appCache.getOrSet(`data:article:${slug}`, 180, async () => {
    try {
      return await prisma.article.findUnique({
        where: { slug, status: "PUBLISHED" },
        include: {
          author: { select: PUBLIC_AUTHOR },
          category: true,
          aiPersona: true,
          tags: { include: { tag: true } },
        },
      });
    } catch (e) {
      console.error(`getArticleBySlug error (${slug}):`, e);
      return null;
    }
  });
});

export const CATEGORY_PAGE_SIZE = 30;

// Tekil Kategori ve İlgili Güncel Haberleri Çekimi
export const getCategoryWithArticles = cache(async (slug: string) => {
  if (isMissingDb) return null;
  return appCache.getOrSet(`data:category:${slug}`, 120, async () => {
    try {
      const category = await prisma.category.findUnique({
        where: { slug },
        include: {
          // Kart için gereken alanlar ve en yeni 30 haber (önceden kategorinin tüm haberleri yükleniyordu)
          articles: {
            where: { status: "PUBLISHED" },
            orderBy: { publishedAt: "desc" },
            take: CATEGORY_PAGE_SIZE,
            select: feedSelect,
          },
          _count: { select: { articles: { where: { status: "PUBLISHED" } } } },
        },
      });
      // Önbelleğe yalnızca kart verisi girer (haber gövdeleri değil)
      return category ? { ...category, articles: category.articles.map(toFeedArticle) } : null;
    } catch (e) {
      console.error(`getCategoryWithArticles error (${slug}):`, e);
      return null;
    }
  });
});

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
const SEARCH_LIMIT = 30;

/**
 * Arama ifadesini PostgreSQL tam metin sorgusuna çevirir: kelimeler Türkçe küçültülür,
 * her kelime ön ek olarak aranır ("cumhurb" → "Cumhurbaşkanı") ve tümü birlikte (VE) aranır.
 * Yalnızca harf ve rakam bırakıldığı için sorgu sözdizimi bozulamaz. Kelime yoksa null.
 */
export function toSearchQuery(raw: string): string | null {
  const words = raw
    .toLocaleLowerCase("tr")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2)
    .slice(0, 8);
  // Uzun kelimelerde yapım ekleri (-ik, -sel, -li, -ci…) kökü değiştirebilir ("ekonomik" ≠ "ekonomi"):
  // kelimenin kısaltılmış ön eki de alternatif olarak aranır
  const term = (w: string) => (w.length >= 6 ? `(${w}:* | ${w.slice(0, Math.max(4, w.length - 3))}:*)` : `${w}:*`);
  return words.length ? words.map(term).join(" & ") : null;
}

/**
 * Haber araması (başlık, spot, metin). Türkçe tam metin dizini kullanılır (kök bulma, ön ek):
 * başlıktaki eşleşme metindekinden, yeni haber eskisinden önce gelir. Dizin sonuç bulamazsa
 * (ör. kelimenin ortasından arama) eski usul metin içi aramaya düşülür.
 */
export const searchArticles = cache(async (rawQuery: string) => {
  const query = rawQuery.trim().slice(0, SEARCH_MAX_LENGTH);
  if (isMissingDb || query.length < SEARCH_MIN_LENGTH) return [];
  try {
    const tsQuery = toSearchQuery(query);
    if (tsQuery) {
      const hits = await prisma.$queryRaw<{ id: string }[]>`
        SELECT a."id"
        FROM "Article" a, to_tsquery('turkish', ${tsQuery}) q
        WHERE a."status" = 'PUBLISHED' AND a."searchVector" @@ q
        ORDER BY ts_rank_cd(a."searchVector", q, 32)
                 * (1 + 2.0 / (1 + EXTRACT(EPOCH FROM (now() - COALESCE(a."publishedAt", a."createdAt"))) / 604800)) DESC,
                 a."publishedAt" DESC NULLS LAST
        LIMIT ${SEARCH_LIMIT}`;
      if (hits.length > 0) {
        const rows = await prisma.article.findMany({ where: { id: { in: hits.map((h) => h.id) } }, select: feedSelect });
        const order = new Map(hits.map((h, i) => [h.id, i]));
        return rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!).map(toFeedArticle);
      }
    }
    return await searchArticlesByText(query);
  } catch (e) {
    console.error("searchArticles error:", e);
    // Arama dizini henüz kurulmamışsa (migration uygulanmadı) eski yönteme düş
    return searchArticlesByText(query).catch(() => []);
  }
});

/**
 * Yedek arama: metin içinde geçiş (yavaş, dizinsiz). Türkçe büyük/küçük harf: veritabanı "i/İ" ve
 * "ı/I" eşleşmesini her zaman yapamadığından ifadenin farklı harf biçimleri de aranır.
 */
async function searchArticlesByText(query: string) {
  const variants = [...new Set([
    query,
    query.charAt(0).toLocaleUpperCase("tr") + query.slice(1),
    query.toLocaleUpperCase("tr"),
    query.toLocaleLowerCase("tr"),
  ])];
  const rows = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      OR: variants.flatMap((v) => [
        { title: { contains: v, mode: "insensitive" as const } },
        { excerpt: { contains: v, mode: "insensitive" as const } },
        { content: { contains: v, mode: "insensitive" as const } },
      ]),
    },
    orderBy: { publishedAt: "desc" },
    take: SEARCH_LIMIT,
    select: feedSelect,
  });
  return rows.map(toFeedArticle);
}
