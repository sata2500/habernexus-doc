import "server-only";

import type { Prisma } from "@/lib/generated/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/admin/list";

const page = (n: number) => ({ skip: (n - 1) * PAGE_SIZE, take: PAGE_SIZE });

export const ARTICLE_STATUSES = ["PUBLISHED", "DRAFT"] as const;

export async function listArticles({ q, status, category, source, pageNo }: {
  q: string; status: string; category: string; source: string; pageNo: number;
}) {
  const base: Prisma.ArticleWhereInput = {
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { author: { name: { contains: q, mode: "insensitive" } } },
      ],
    }),
    ...(category && { categoryId: category }),
    ...(source === "ai" && { aiPersonaId: { not: null } }),
    ...(source === "insan" && { aiPersonaId: null }),
  };
  const where: Prisma.ArticleWhereInput = {
    ...base,
    ...((ARTICLE_STATUSES as readonly string[]).includes(status) && { status }),
  };

  const [items, total, published, drafts, categories] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...page(pageNo),
      // İçerik gövdesi listede gerekmez; yalnızca satırda görünen alanlar
      select: {
        id: true, title: true, slug: true, status: true, viewCount: true, createdAt: true, publishedAt: true,
        qualityScore: true, plagiarismRate: true, seoScore: true, readabilityScore: true, analysisReport: true,
        author: { select: { name: true } },
        aiPersona: { select: { name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.article.count({ where }),
    prisma.article.count({ where: { ...base, status: "PUBLISHED" } }),
    prisma.article.count({ where: { ...base, status: "DRAFT" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { order: "asc" } }),
  ]);
  return { items, total, counts: { all: published + drafts, published, drafts }, categories };
}

export type AdminArticleRow = Awaited<ReturnType<typeof listArticles>>["items"][number];

export const USER_ROLES = ["USER", "AUTHOR", "ADMIN"] as const;

export async function listUsers({ q, role, pageNo }: { q: string; role: string; pageNo: number }) {
  const base: Prisma.UserWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
    : {};
  const where: Prisma.UserWhereInput = { ...base, ...((USER_ROLES as readonly string[]).includes(role) && { role }) };

  const [items, total, byRole] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...page(pageNo),
      select: {
        id: true, name: true, email: true, image: true, role: true, createdAt: true,
        _count: { select: { articles: true, comments: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["role"], where: base, _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(byRole.map((r) => [r.role, r._count._all])) as Record<string, number>;
  return { items, total, counts };
}

export type AdminUserRow = Awaited<ReturnType<typeof listUsers>>["items"][number];

export async function listComments({ q, pageNo }: { q: string; pageNo: number }) {
  const where: Prisma.CommentWhereInput = q
    ? {
        OR: [
          { content: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { article: { title: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...page(pageNo),
      select: {
        id: true, content: true, createdAt: true,
        user: { select: { name: true, image: true, email: true } },
        article: { select: { title: true, slug: true } },
      },
    }),
    prisma.comment.count({ where }),
  ]);
  return { items, total };
}
