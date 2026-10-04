import "server-only";

import { prisma } from "./prisma";
import { feedSelect, toFeedArticle } from "./feed";
import type { FeedArticle } from "./feed-types";

/** Okuma geçmişi çerezi: en yeni okunan başta, virgülle ayrılmış haber id'leri */
export const READ_HISTORY_COOKIE = "hn_reads";
export const READ_HISTORY_MAX = 30;

const SIGNAL_WEIGHT = { bookmark: 3, comment: 2, read: 1.5 } as const;
const FRESHNESS_HALF_LIFE_HOURS = 36;
const CANDIDATE_WINDOW_DAYS = 14;
const CANDIDATE_POOL = 150;

export type RecommendationReason = "category" | "similar" | "popular";

export interface Recommendation extends FeedArticle {
  reason: RecommendationReason;
  reasonLabel: string;
}

export function parseReadHistory(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-z0-9]{10,40}$/i.test(id))
    .slice(0, READ_HISTORY_MAX);
}

type Profile = {
  categories: Map<string, number>;
  categoryNames: Map<string, string>;
  tags: Map<string, number>;
  seenIds: Set<string>;
};

async function buildProfile(userId: string | undefined, readIds: string[]): Promise<Profile> {
  const profile: Profile = {
    categories: new Map(),
    categoryNames: new Map(),
    tags: new Map(),
    seenIds: new Set(readIds),
  };

  const [bookmarks, comments] = userId
    ? await Promise.all([
        prisma.bookmark.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { articleId: true },
        }),
        prisma.comment.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { articleId: true },
        }),
      ])
    : [[], []];

  // Her sinyal için ağırlık; okuma geçmişinde yeni okunanlar daha etkili
  const weights = new Map<string, number>();
  const add = (id: string, w: number) => weights.set(id, (weights.get(id) ?? 0) + w);
  bookmarks.forEach((b) => add(b.articleId, SIGNAL_WEIGHT.bookmark));
  comments.forEach((c) => add(c.articleId, SIGNAL_WEIGHT.comment));
  readIds.forEach((id, i) => add(id, SIGNAL_WEIGHT.read * (1 - i / (READ_HISTORY_MAX * 2))));

  if (weights.size === 0) return profile;
  for (const id of weights.keys()) profile.seenIds.add(id);

  const signalArticles = await prisma.article.findMany({
    where: { id: { in: [...weights.keys()] } },
    select: {
      id: true,
      categoryId: true,
      category: { select: { name: true } },
      tags: { select: { tagId: true } },
    },
  });

  for (const a of signalArticles) {
    const w = weights.get(a.id) ?? 0;
    if (a.categoryId) {
      profile.categories.set(a.categoryId, (profile.categories.get(a.categoryId) ?? 0) + w);
      if (a.category) profile.categoryNames.set(a.categoryId, a.category.name);
    }
    for (const t of a.tags) profile.tags.set(t.tagId, (profile.tags.get(t.tagId) ?? 0) + w);
  }

  return profile;
}

/**
 * "Sizin İçin" önerileri.
 *
 * Sinyaller: kaydedilenler (×3), yorum yapılanlar (×2), okuma geçmişi (×1.5, yeniler daha ağır).
 * Puan = 0.45·kategori ilgisi + 0.25·etiket benzerliği + 0.20·güncellik + 0.10·popülerlik.
 * Sinyal yoksa güncellik ve popülerliğe göre sıralanır.
 * Aynı kategoriden art arda seçimler cezalandırılarak liste çeşitli tutulur.
 */
export async function getPersonalizedFeed({
  userId,
  readIds = [],
  excludeIds = [],
  limit = 6,
}: {
  userId?: string;
  readIds?: string[];
  excludeIds?: string[];
  limit?: number;
}): Promise<{ items: Recommendation[]; personalized: boolean }> {
  if (!process.env.DATABASE_URL) return { items: [], personalized: false };

  const profile = await buildProfile(userId, readIds);
  const personalized = profile.categories.size > 0 || profile.tags.size > 0;
  const exclude = [...new Set([...profile.seenIds, ...excludeIds])];

  const fetchCandidates = (days: number) =>
    prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: new Date(Date.now() - days * 86_400_000) },
        ...(exclude.length ? { id: { notIn: exclude } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: CANDIDATE_POOL,
      select: { ...feedSelect, categoryId: true, tags: { select: { tagId: true } } },
    });

  let candidates = await fetchCandidates(CANDIDATE_WINDOW_DAYS);
  if (candidates.length < limit * 3) candidates = await fetchCandidates(365);
  if (candidates.length === 0) return { items: [], personalized };

  const maxCat = Math.max(1, ...profile.categories.values());
  const maxTag = Math.max(1, ...profile.tags.values());
  const maxViews = Math.max(1, ...candidates.map((c) => c.viewCount));
  const now = Date.now();

  const scored = candidates.map((c) => {
    const catScore = c.categoryId ? (profile.categories.get(c.categoryId) ?? 0) / maxCat : 0;
    const tagRaw = c.tags.reduce((sum, t) => sum + (profile.tags.get(t.tagId) ?? 0), 0);
    const tagScore = Math.min(1, tagRaw / maxTag);
    const ageHours = c.publishedAt ? (now - c.publishedAt.getTime()) / 3_600_000 : 9999;
    const fresh = Math.pow(0.5, Math.max(0, ageHours) / FRESHNESS_HALF_LIFE_HOURS);
    const pop = Math.log1p(c.viewCount) / Math.log1p(maxViews);

    const score = personalized
      ? 0.45 * catScore + 0.25 * tagScore + 0.2 * fresh + 0.1 * pop
      : 0.6 * fresh + 0.4 * pop;

    let reason: RecommendationReason = "popular";
    if (personalized && tagScore >= 0.3 && tagScore >= catScore) reason = "similar";
    else if (personalized && catScore > 0) reason = "category";

    return { row: c, score, reason };
  });

  // Çeşitlilik: aynı kategoriden her ek seçim puanı %25 düşürür
  const picked: typeof scored = [];
  const perCategory = new Map<string, number>();
  const pool = [...scored];
  while (picked.length < limit && pool.length > 0) {
    let bestIdx = 0;
    let best = -Infinity;
    pool.forEach((s, i) => {
      const n = s.row.categoryId ? perCategory.get(s.row.categoryId) ?? 0 : 0;
      const adjusted = s.score * Math.pow(0.75, n);
      if (adjusted > best) { best = adjusted; bestIdx = i; }
    });
    const [chosen] = pool.splice(bestIdx, 1);
    picked.push(chosen);
    if (chosen.row.categoryId) {
      perCategory.set(chosen.row.categoryId, (perCategory.get(chosen.row.categoryId) ?? 0) + 1);
    }
  }

  return {
    personalized,
    items: picked.map(({ row, reason }) => ({
      ...toFeedArticle(row),
      reason,
      reasonLabel:
        reason === "similar"
          ? "Okuduklarınıza benzer"
          : reason === "category"
            ? `${profile.categoryNames.get(row.categoryId ?? "") ?? row.category?.name ?? "Bu kategori"} ilginize göre`
            : "Gündemde öne çıkan",
    })),
  };
}
