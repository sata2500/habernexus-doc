import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Giriş yapmış okurların okuma geçmişi. "Okundu" = haberin sonuna (tepkiler bölümüne) ulaşıldı.
 * Tablo henüz oluşturulmamışsa (veritabanı güncellemesi uygulanmadıysa) sorgular boş döner.
 */

export const READ_COMPLETE_AT = 97;
const UNFINISHED_MIN = 10;
const UNFINISHED_MAX_AGE_DAYS = 30;

const articleCard = {
  id: true, slug: true, title: true, coverImage: true, publishedAt: true,
  category: { select: { name: true, color: true } },
} as const;

export async function recordRead(userId: string, articleId: string, progress: number) {
  const value = Math.max(0, Math.min(100, Math.round(progress)));
  const existing = await prisma.articleRead.findUnique({
    where: { userId_articleId: { userId, articleId } },
    select: { progress: true, completedAt: true },
  });
  const completed = value >= READ_COMPLETE_AT;
  if (existing) {
    // İlerleme geriye düşmez; okundu işareti kalıcıdır. Yine de son okuma zamanı güncellenir.
    const row = await prisma.articleRead.update({
      where: { userId_articleId: { userId, articleId } },
      data: {
        progress: Math.max(existing.progress, value),
        ...(completed && !existing.completedAt && { completedAt: new Date() }),
      },
      select: { progress: true, completedAt: true },
    });
    return { progress: row.progress, completed: !!row.completedAt, justCompleted: completed && !existing.completedAt };
  }
  const row = await prisma.articleRead.create({
    data: { userId, articleId, progress: value, completedAt: completed ? new Date() : null },
    select: { progress: true, completedAt: true },
  });
  return { progress: row.progress, completed: !!row.completedAt, justCompleted: completed };
}

/** Yarım kalan (başlanmış, bitmemiş, yakın zamanda açılmış) yayındaki haberler */
export async function getUnfinishedReads(userId: string, take = 6) {
  const since = new Date(Date.now() - UNFINISHED_MAX_AGE_DAYS * 86_400_000);
  return prisma.articleRead
    .findMany({
      where: { userId, completedAt: null, progress: { gte: UNFINISHED_MIN }, updatedAt: { gte: since }, article: { status: "PUBLISHED" } },
      orderBy: { updatedAt: "desc" },
      take,
      select: { progress: true, updatedAt: true, article: { select: articleCard } },
    })
    .catch(() => []);
}

export const READ_HISTORY_PAGE_SIZE = 24;

export async function getCompletedReads(userId: string, pageNo = 1) {
  const where = { userId, completedAt: { not: null }, article: { status: "PUBLISHED" } };
  const [items, total] = await Promise.all([
    prisma.articleRead.findMany({
      where,
      orderBy: { completedAt: "desc" },
      skip: (pageNo - 1) * READ_HISTORY_PAGE_SIZE,
      take: READ_HISTORY_PAGE_SIZE,
      select: { completedAt: true, article: { select: articleCard } },
    }),
    prisma.articleRead.count({ where }),
  ]).catch(() => [[], 0] as const);
  return { items, total };
}

/** Öneriler için: son okunanlar (bitirilenler daha güçlü sinyal) */
export async function getReadSignals(userId: string) {
  return prisma.articleRead
    .findMany({
      where: { userId, progress: { gte: 30 } },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: { articleId: true, completedAt: true },
    })
    .catch(() => []);
}

export async function removeRead(userId: string, articleId: string) {
  await prisma.articleRead.deleteMany({ where: { userId, articleId } });
}

export async function clearReads(userId: string) {
  await prisma.articleRead.deleteMany({ where: { userId } });
}
