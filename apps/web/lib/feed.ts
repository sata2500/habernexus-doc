import "server-only";

import { prisma } from "./prisma";
import type { FeedArticle, FeedPage } from "./feed-types";
import { readingMinutes } from "./utils";

const feedSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  content: true,
  viewCount: true,
  publishedAt: true,
  category: { select: { name: true, slug: true, color: true } },
  author: { select: { name: true, image: true } },
  aiPersona: { select: { name: true, image: true } },
} as const;

type FeedRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  content: string;
  viewCount: number;
  publishedAt: Date | null;
  category: { name: string; slug: string; color: string | null } | null;
  author: { name: string; image: string | null };
  aiPersona: { name: string; image: string | null } | null;
};

/** İçerik gövdesini istemciye göndermeden kart için gereken alanları üretir. */
export function toFeedArticle(row: FeedRow): FeedArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.coverImage,
    viewCount: row.viewCount,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    readingMinutes: readingMinutes(row.content),
    category: row.category,
    authorName: row.aiPersona?.name || row.author.name,
    authorImage: row.aiPersona?.image || row.author.image,
  };
}

/* Cursor: "<publishedAt ISO>_<id>" — aynı saniyede yayınlanan haberlerde de kararlı sıralama */
function encodeCursor(row: { publishedAt: Date | null; id: string }) {
  return `${(row.publishedAt ?? new Date(0)).toISOString()}_${row.id}`;
}

function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return null;
  const sep = cursor.lastIndexOf("_");
  if (sep <= 0) return null;
  const date = new Date(cursor.slice(0, sep));
  const id = cursor.slice(sep + 1);
  if (Number.isNaN(date.getTime()) || !id) return null;
  return { date, id };
}

/**
 * Yayın tarihine göre (en yeniden en eskiye) sayfalı haber akışı.
 */
export async function getFeedPage({
  cursor,
  limit = 12,
  categorySlug,
  excludeIds = [],
}: {
  cursor?: string | null;
  limit?: number;
  categorySlug?: string | null;
  excludeIds?: string[];
}): Promise<FeedPage> {
  if (!process.env.DATABASE_URL) return { items: [], nextCursor: null };

  const take = Math.min(Math.max(limit, 1), 30);
  const after = decodeCursor(cursor);

  const rows = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      ...(after
        ? {
            OR: [
              { publishedAt: { lt: after.date } },
              { publishedAt: after.date, id: { lt: after.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: feedSelect,
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    items: page.map(toFeedArticle),
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  };
}

export { feedSelect };

/**
 * Bir haberle ilgili haberler: önce ortak etiketler, sonra aynı kategorideki son haberler,
 * yetmezse en yeni haberlerle tamamlanır. Son 30 günle sınırlıdır.
 */
export async function getRelatedArticles(
  article: { id: string; categoryId: string | null; tagIds: string[] },
  limit = 4,
): Promise<FeedArticle[]> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const base = { status: "PUBLISHED" as const, publishedAt: { gte: since } };
  const picked = new Map<string, FeedRow>();
  const take = async (where: object) => {
    if (picked.size >= limit) return;
    const rows = await prisma.article.findMany({
      where: { ...base, ...where, id: { notIn: [article.id, ...picked.keys()] } },
      orderBy: { publishedAt: "desc" },
      take: limit - picked.size,
      select: feedSelect,
    });
    rows.forEach((r) => picked.set(r.id, r));
  };

  try {
    if (article.tagIds.length) await take({ tags: { some: { tagId: { in: article.tagIds } } } });
    if (article.categoryId) await take({ categoryId: article.categoryId });
    await take({});
  } catch (error) {
    console.error("[Feed] İlgili haberler alınamadı:", error);
  }
  return [...picked.values()].map(toFeedArticle);
}
