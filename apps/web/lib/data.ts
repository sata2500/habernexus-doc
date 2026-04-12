import { cache } from "react";
import { prisma } from "./prisma";

// Kapak haberi (Şimdilik direkt en son yayınlanan haber olarak ayarlandı)
export const getHeroArticle = cache(async () => {
  return await prisma.article.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      category: true,
      author: true,
    },
  });
});

// Trend haberler (Okunma sayısına göre)
export const getTrendingArticles = cache(async (limit: number = 4) => {
  return await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { viewCount: "desc" },
    take: limit,
    include: {
      category: true,
      author: true,
    },
  });
});

// Son haberler (Yayınlanma zamanına göre)
export const getLatestArticles = cache(async (limit: number = 6) => {
  return await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: {
      category: true,
      author: true,
    },
  });
});

// Kategoriler ve onlara ait yayınlanmış makale sayısı
export const getCategoriesWithCount = cache(async () => {
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
});

// Tekil Makale Detayı Çekimi (Slug Bazlı)
export const getArticleBySlug = cache(async (slug: string) => {
  return await prisma.article.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: true,
      category: true,
      tags: { include: { tag: true } }
    }
  });
});

// Tekil Kategori ve İlgili Güncel Haberleri Çekimi
export const getCategoryWithArticles = cache(async (slug: string) => {
  return await prisma.category.findUnique({
    where: { slug },
    include: {
      articles: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        include: { author: true, category: true }
      }
    }
  });
});

// Arama Motoru (Metin bazlı basit arama)
export const searchArticles = cache(async (query: string) => {
  return await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: query } },
        { excerpt: { contains: query } },
        { content: { contains: query } }
      ]
    },
    orderBy: { publishedAt: "desc" },
    include: { author: true, category: true }
  });
});

// UI'da "dk okuma" değerlerini göstermek için basit bir yardımcı fonksiyon
export function estimateReadingTime(text: string): number {
  if (!text) return 1;
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
