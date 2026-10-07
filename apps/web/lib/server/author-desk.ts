import "server-only";

import type { Prisma } from "@/lib/generated/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server/authz";

/**
 * Yazar Masası sorguları. Liste ve özetlerde içerik gövdesi çekilmez; yalnızca
 * oturum sahibinin kendi haberleri döner (admin de kendi haberlerini görür).
 */

export const AUTHOR_PAGE_SIZE = 20;

export async function requireAuthor() {
  return requireRole("AUTHOR", "ADMIN");
}

const listSelect = {
  id: true, title: true, slug: true, status: true, viewCount: true, coverImage: true,
  publishedAt: true, createdAt: true, updatedAt: true, aiPersonaId: true,
  plagiarismRate: true, seoScore: true, readabilityScore: true, qualityScore: true, analysisReport: true,
  category: { select: { id: true, name: true, color: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.ArticleSelect;

export type AuthorArticleRow = Prisma.ArticleGetPayload<{ select: typeof listSelect }>;

export async function listAuthorArticles({ q, status, pageNo }: { q: string; status: string; pageNo: number }) {
  const session = await requireAuthor();
  const base: Prisma.ArticleWhereInput = {
    authorId: session.user.id,
    ...(q && { title: { contains: q, mode: "insensitive" } }),
  };
  const where: Prisma.ArticleWhereInput = { ...base, ...((status === "PUBLISHED" || status === "DRAFT") && { status }) };
  const [items, total, published, drafts] = await Promise.all([
    prisma.article.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (pageNo - 1) * AUTHOR_PAGE_SIZE, take: AUTHOR_PAGE_SIZE, select: listSelect }),
    prisma.article.count({ where }),
    prisma.article.count({ where: { ...base, status: "PUBLISHED" } }),
    prisma.article.count({ where: { ...base, status: "DRAFT" } }),
  ]);
  return { items, total, counts: { all: published + drafts, published, drafts } };
}

/** Yazar özeti: sayılar, taslaklar, son haberler ve son yorumlar */
export async function getAuthorOverview() {
  const session = await requireAuthor();
  const mine = { authorId: session.user.id };
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [published, drafts, views, comments30, recent, draftList, latestComments] = await Promise.all([
    prisma.article.count({ where: { ...mine, status: "PUBLISHED" } }),
    prisma.article.count({ where: { ...mine, status: "DRAFT" } }),
    prisma.article.aggregate({ where: mine, _sum: { viewCount: true } }).then((r) => r._sum.viewCount ?? 0),
    prisma.comment.count({ where: { article: mine, createdAt: { gte: since30 } } }),
    prisma.article.findMany({ where: { ...mine, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 5, select: listSelect }),
    prisma.article.findMany({ where: { ...mine, status: "DRAFT" }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, title: true, updatedAt: true } }),
    prisma.comment.findMany({
      where: { article: mine },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, content: true, createdAt: true, user: { select: { name: true } }, article: { select: { title: true, slug: true } } },
    }),
  ]);
  return { name: session.user.name, counts: { published, drafts, views, comments30 }, recent, draftList, latestComments };
}

/** Gerçek verilerle istatistikler: okunma, yorum, tepki ve kategori dağılımı */
export async function getAuthorStats() {
  const session = await requireAuthor();
  const mine = { authorId: session.user.id };
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [articles, comments, reactions, published30] = await Promise.all([
    prisma.article.findMany({
      where: { ...mine, status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, viewCount: true, publishedAt: true, category: { select: { name: true, color: true } }, _count: { select: { comments: true } } },
    }),
    prisma.comment.count({ where: { article: mine } }),
    prisma.articleReaction.count({ where: { article: mine } }).catch(() => 0),
    prisma.article.count({ where: { ...mine, status: "PUBLISHED", publishedAt: { gte: since30 } } }),
  ]);
  const views = articles.reduce((s, a) => s + a.viewCount, 0);
  const top = [...articles].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const byCategory = new Map<string, { name: string; color: string | null; count: number; views: number }>();
  for (const a of articles) {
    const key = a.category?.name ?? "Kategorisiz";
    const c = byCategory.get(key) ?? { name: key, color: a.category?.color ?? null, count: 0, views: 0 };
    c.count++;
    c.views += a.viewCount;
    byCategory.set(key, c);
  }
  return {
    published: articles.length,
    published30,
    views,
    avgViews: articles.length ? Math.round(views / articles.length) : 0,
    comments,
    reactions,
    top,
    categories: [...byCategory.values()].sort((a, b) => b.views - a.views),
  };
}

export async function getCategoryOptions() {
  return prisma.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } });
}

/** Düzenleme için haber: yazar yalnızca kendi haberini, admin her haberi açabilir */
export async function getArticleForEdit(id: string) {
  const session = await requireAuthor();
  const article = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true, title: true, slug: true, excerpt: true, content: true, coverImage: true, categoryId: true, status: true, authorId: true, publishedAt: true, updatedAt: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  if (!article) return null;
  if (session.user.role !== "ADMIN" && article.authorId !== session.user.id) return null;
  return article;
}

/** "Haber yaz" ile gelinen öneri: başlık, özet ve kaynak bağlantıları editöre aktarılır */
export async function getSuggestionForEditor(storyId: string) {
  await requireAuthor();
  const story = await prisma.newsStory.findUnique({
    where: { id: storyId },
    select: {
      id: true, title: true, headline: true, summary: true, categoryName: true,
      items: { orderBy: { publishedAt: "asc" }, take: 6, select: { title: true, url: true, excerpt: true, imageUrl: true, source: { select: { name: true } } } },
    },
  });
  if (!story) return null;
  return {
    id: story.id,
    title: story.headline || story.title,
    summary: story.summary || story.items.find((i) => i.excerpt)?.excerpt || "",
    categoryName: story.categoryName,
    sources: story.items.map((i) => ({ title: i.title, url: i.url, source: i.source.name })),
  };
}
