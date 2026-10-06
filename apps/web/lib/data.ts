import { cache } from "react";
import { prisma } from "./prisma";
import { appCache } from "./cache";

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
      return await prisma.category.findUnique({
        where: { slug },
        include: {
          // Kart için gereken alanlar ve en yeni 30 haber (önceden kategorinin tüm haberleri yükleniyordu)
          articles: {
            where: { status: "PUBLISHED" },
            orderBy: { publishedAt: "desc" },
            take: CATEGORY_PAGE_SIZE,
            select: {
              id: true, title: true, slug: true, excerpt: true, coverImage: true, viewCount: true, publishedAt: true, createdAt: true,
              content: true, // okuma süresi için (yalnızca 30 haber)
              author: { select: PUBLIC_AUTHOR }, aiPersona: { select: { name: true, image: true } },
            },
          },
          _count: { select: { articles: { where: { status: "PUBLISHED" } } } },
        },
      });
    } catch (e) {
      console.error(`getCategoryWithArticles error (${slug}):`, e);
      return null;
    }
  });
});

// Arama Motoru
export const searchArticles = cache(async (query: string) => {
  if (isMissingDb) return [];
  try {
    return await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      include: { author: { select: PUBLIC_AUTHOR }, category: true, aiPersona: true },
    });
  } catch (e) {
    console.error("searchArticles error:", e);
    return [];
  }
});
