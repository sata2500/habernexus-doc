import "server-only";

import type { Prisma, StoryStatus } from "@/lib/generated/client";
import { prisma } from "@/lib/prisma";
import { keyTokens } from "./text";

const HOUR = 3_600_000;
export const STORY_PAGE_SIZE = 30;

export const TABS = ["sira", "degerlendirme", "yayinlanan", "elenen", "trendler", "kaynaklar"] as const;
export type DecisionTab = (typeof TABS)[number];

const ELIMINATED: StoryStatus[] = ["DUPLICATE", "LOW_SCORE", "EXPIRED", "DISMISSED", "FAILED"];

export interface StoryView {
  id: string;
  title: string;
  headline: string | null;
  summary: string | null;
  status: StoryStatus;
  urgency: string;
  score: number;
  parts: { importance: number; coverage: number; freshness: number; trend: number; urgency: number } | null;
  aiScore: number | null;
  sourceCount: number;
  itemCount: number;
  trendKeyword: string | null;
  trendScore: number;
  categoryName: string | null;
  firstSeenAt: string;
  eventAt: string | null;
  expiresAt: string | null;
  pinned: boolean;
  reason: string | null;
  lastError: string | null;
  fallback: boolean;
  related: { title: string; slug: string } | null;
  duplicate: { title: string; slug: string } | null;
  article: { title: string; slug: string; publishedAt: string | null } | null;
  items: { id: string; title: string; url: string; source: string; publishedAt: string | null }[];
}

async function minScore() {
  const s = await prisma.systemSettings.findUnique({ where: { id: "global" }, select: { storyMinScore: true } });
  return s?.storyMinScore ?? 60;
}

function tabWhere(tab: DecisionTab, min: number, q: string): Prisma.NewsStoryWhereInput {
  const now = new Date();
  const search: Prisma.NewsStoryWhereInput = q
    ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { headline: { contains: q, mode: "insensitive" } }] }
    : {};
  switch (tab) {
    case "sira":
      return {
        ...search,
        OR: [
          { status: "WRITING" },
          { status: "READY", OR: [{ score: { gte: min } }, { pinned: true }], AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] },
        ],
      };
    case "degerlendirme":
      return { ...search, OR: [{ status: "NEW" }, { status: "READY", score: { lt: min }, pinned: false }] };
    case "yayinlanan":
      return { ...search, status: "PUBLISHED" };
    case "elenen":
      return { ...search, status: { in: ELIMINATED }, updatedAt: { gte: new Date(now.getTime() - 3 * 24 * HOUR) } };
    default:
      return { id: "__none__" };
  }
}

function tabOrder(tab: DecisionTab): Prisma.NewsStoryOrderByWithRelationInput[] {
  if (tab === "sira") return [{ status: "desc" }, { pinned: "desc" }, { score: "desc" }];
  if (tab === "degerlendirme") return [{ score: "desc" }, { lastSeenAt: "desc" }];
  return [{ updatedAt: "desc" }];
}

export async function getDecisionOverview() {
  const min = await minScore();
  const now = new Date();
  const [queue, evaluating, writing, published24h, eliminated, newCount, lastScan, lastAnalysis, sources, trends, settings] = await Promise.all([
    prisma.newsStory.count({ where: tabWhere("sira", min, "") }),
    prisma.newsStory.count({ where: tabWhere("degerlendirme", min, "") }),
    prisma.newsStory.count({ where: { status: "WRITING" } }),
    prisma.newsStory.count({ where: { status: "PUBLISHED", updatedAt: { gte: new Date(now.getTime() - 24 * HOUR) } } }),
    prisma.newsStory.count({ where: tabWhere("elenen", min, "") }),
    prisma.newsStory.count({ where: { status: "NEW" } }),
    prisma.rssFeedSource.aggregate({ _max: { lastFetchedAt: true } }),
    prisma.newsStory.aggregate({ _max: { analyzedAt: true } }),
    prisma.rssFeedSource.count({ where: { isActive: true } }),
    prisma.googleTrend.count({ where: { updatedAt: { gte: new Date(now.getTime() - 24 * HOUR) } } }),
    prisma.systemSettings.findUnique({ where: { id: "global" }, select: { aiWriterAutoEnabled: true, aiWriterAutoCount: true, googleTrendsEnabled: true } }),
  ]);
  return {
    minScore: min,
    counts: { queue, evaluating, writing, published24h, eliminated, newCount, sources, trends },
    lastScanAt: lastScan._max.lastFetchedAt?.toISOString() ?? null,
    lastAnalysisAt: lastAnalysis._max.analyzedAt?.toISOString() ?? null,
    autoWriter: { enabled: !!settings?.aiWriterAutoEnabled, count: settings?.aiWriterAutoCount ?? 3 },
    trendsEnabled: settings?.googleTrendsEnabled !== false,
  };
}

export async function listStories(tab: DecisionTab, q: string, page: number) {
  const min = await minScore();
  const where = tabWhere(tab, min, q);
  const [rows, total] = await Promise.all([
    prisma.newsStory.findMany({
      where,
      orderBy: tabOrder(tab),
      skip: (page - 1) * STORY_PAGE_SIZE,
      take: STORY_PAGE_SIZE,
      include: {
        article: { select: { title: true, slug: true, publishedAt: true } },
        items: {
          orderBy: { publishedAt: "asc" },
          take: 8,
          select: { id: true, title: true, url: true, publishedAt: true, source: { select: { name: true } } },
        },
      },
    }),
    prisma.newsStory.count({ where }),
  ]);

  const refIds = [...new Set(rows.flatMap((r) => [r.relatedArticleId, r.duplicateArticleId]).filter((x): x is string => !!x))];
  const refs = refIds.length
    ? new Map((await prisma.article.findMany({ where: { id: { in: refIds } }, select: { id: true, title: true, slug: true } })).map((a) => [a.id, a]))
    : new Map<string, { title: string; slug: string }>();

  const stories: StoryView[] = rows.map((r) => {
    const analysis = (r.analysis && typeof r.analysis === "object" ? r.analysis : {}) as Record<string, unknown>;
    return {
      id: r.id,
      title: r.title,
      headline: r.headline,
      summary: r.summary,
      status: r.status,
      urgency: r.urgency,
      score: r.score,
      parts: (analysis.parts as StoryView["parts"]) ?? null,
      aiScore: r.aiScore,
      sourceCount: r.sourceCount,
      itemCount: r.itemCount,
      trendKeyword: r.trendKeyword,
      trendScore: r.trendScore,
      categoryName: r.categoryName,
      firstSeenAt: r.firstSeenAt.toISOString(),
      eventAt: r.eventAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      pinned: r.pinned,
      reason: r.reason,
      lastError: r.lastError,
      fallback: analysis.fallback === true,
      related: r.relatedArticleId ? refs.get(r.relatedArticleId) ?? null : null,
      duplicate: r.duplicateArticleId ? refs.get(r.duplicateArticleId) ?? null : null,
      article: r.article ? { title: r.article.title, slug: r.article.slug, publishedAt: r.article.publishedAt?.toISOString() ?? null } : null,
      items: r.items.map((i) => ({ id: i.id, title: i.title, url: i.url, source: i.source.name, publishedAt: i.publishedAt?.toISOString() ?? null })),
    };
  });
  return { stories, total, minScore: min };
}

export interface TrendView {
  id: string;
  keyword: string;
  searchVolume: string | null;
  trafficScore: number;
  exploreUrl: string | null;
  story: { id: string; title: string; status: StoryStatus; score: number } | null;
  covered: { title: string; slug: string } | null;
}

/** Son 24 saatin trendleri; her trendin Karar Merkezi'ndeki karşılığı ve yayında olup olmadığı. */
export async function listTrends(): Promise<TrendView[]> {
  const since = new Date(Date.now() - 24 * HOUR);
  const [trends, stories, articles] = await Promise.all([
    prisma.googleTrend.findMany({ where: { updatedAt: { gte: since } }, orderBy: { trafficScore: "desc" }, take: 40 }),
    prisma.newsStory.findMany({
      where: { trendKeyword: { not: null }, lastSeenAt: { gte: new Date(Date.now() - 72 * HOUR) } },
      select: { id: true, title: true, headline: true, status: true, score: true, trendKeyword: true, article: { select: { title: true, slug: true } } },
      orderBy: { score: "desc" },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - 48 * HOUR) } },
      select: { title: true, slug: true },
      take: 400,
      orderBy: { publishedAt: "desc" },
    }),
  ]);
  const articleTokens = articles.map((a) => ({ a, t: new Set(keyTokens(a.title)) }));

  return trends.map((t) => {
    const story = stories.find((s) => s.trendKeyword === t.keyword) ?? null;
    const tokens = keyTokens(t.keyword);
    const coveredArticle = story?.article
      ?? (tokens.length ? articleTokens.find(({ t: set }) => tokens.every((k) => set.has(k)))?.a ?? null : null);
    return {
      id: t.id,
      keyword: t.keyword,
      searchVolume: t.searchVolume,
      trafficScore: t.trafficScore,
      exploreUrl: t.exploreUrl,
      story: story ? { id: story.id, title: story.headline || story.title, status: story.status, score: story.score } : null,
      covered: coveredArticle,
    };
  });
}

/** Yazım sırasındaki konu sayısı (genel bakış ve AI Yazar sayfaları için) */
export async function countQueue() {
  const min = await minScore();
  return prisma.newsStory.count({ where: tabWhere("sira", min, "") });
}
