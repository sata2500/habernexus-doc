import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Statik sayfalar
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/latest`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Bilgi sayfaları
    ...["about", "contact", "careers", "advertise", "privacy", "terms", "cookies", "kvkk"].map(
      (slug) => ({
        url: `${BASE_URL}/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.3,
      })
    ),
  ];

  // Yayınlanmış makaleler
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    });

    articlePages = articles.map((article) => ({
      url: `${BASE_URL}/article/${article.slug}`,
      lastModified: article.updatedAt || article.publishedAt || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Build sırasında veritabanı olmayabilir
  }

  // Kategoriler
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    });

    categoryPages = categories.map((category) => ({
      url: `${BASE_URL}/category/${category.slug}`,
      lastModified: category.updatedAt || new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch {
    // Build sırasında veritabanı olmayabilir
  }

  return [...staticPages, ...articlePages, ...categoryPages];
}
