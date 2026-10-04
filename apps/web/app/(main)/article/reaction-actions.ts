"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitAsync, getActionIdentity } from "@/lib/server/rate-limit";
import { emptyCounts, REACTION_TYPES, type ReactionSummary, type ReactionType } from "@/lib/reaction-types";

const VISITOR_COOKIE = "hn_vid";
const ArticleIdSchema = z.string().trim().min(1).max(100);
const ReactionSchema = z.enum(REACTION_TYPES).nullable();

/** Tablo henüz yoksa (migration uygulanmadı) Prisma P2021 fırlatır */
function isMissingTable(error: unknown) {
  return (error as { code?: string })?.code === "P2021";
}

async function getIdentity(createVisitor: boolean) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) return { userId: session.user.id, visitorId: null };

  const store = await cookies();
  let visitorId = store.get(VISITOR_COOKIE)?.value ?? null;
  if (visitorId && !/^[0-9a-f-]{36}$/.test(visitorId)) visitorId = null;
  if (!visitorId && createVisitor) {
    visitorId = randomUUID();
    store.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return { userId: null, visitorId };
}

async function summarize(articleId: string, identity: { userId: string | null; visitorId: string | null }): Promise<ReactionSummary> {
  const [groups, mine] = await Promise.all([
    prisma.articleReaction.groupBy({ by: ["type"], where: { articleId }, _count: { _all: true } }),
    identity.userId || identity.visitorId
      ? prisma.articleReaction.findFirst({
          where: identity.userId ? { articleId, userId: identity.userId } : { articleId, visitorId: identity.visitorId },
          select: { type: true },
        })
      : null,
  ]);
  const counts = emptyCounts();
  for (const g of groups) {
    if (g.type in counts) counts[g.type as ReactionType] = g._count._all;
  }
  return { available: true, counts, mine: (mine?.type as ReactionType | undefined) ?? null };
}

export async function getArticleReactions(articleId: string): Promise<ReactionSummary> {
  const id = ArticleIdSchema.safeParse(articleId);
  if (!id.success) return { available: false, counts: emptyCounts(), mine: null };
  try {
    return await summarize(id.data, await getIdentity(false));
  } catch (error) {
    if (!isMissingTable(error)) console.error("getArticleReactions error:", error);
    return { available: false, counts: emptyCounts(), mine: null };
  }
}

/**
 * Tepki ver / değiştir / geri al (aynı tepkiye tekrar basmak veya null göndermek geri alır).
 * Kişi başına haber başına tek tepki: giriş yapmış kullanıcı hesabıyla, ziyaretçi çerez kimliğiyle.
 */
export async function setArticleReaction(articleId: string, type: ReactionType | null) {
  const id = ArticleIdSchema.safeParse(articleId);
  const reaction = ReactionSchema.safeParse(type);
  if (!id.success || !reaction.success) return { success: false as const, error: "Geçersiz istek." };

  const rate = await checkRateLimitAsync(`reaction:${await getActionIdentity()}`, 30, 10 * 60 * 1000);
  if (!rate.allowed) return { success: false as const, error: "Çok fazla işlem yaptınız, biraz sonra tekrar deneyin." };

  try {
    const article = await prisma.article.findFirst({ where: { id: id.data, status: "PUBLISHED" }, select: { id: true } });
    if (!article) return { success: false as const, error: "Haber bulunamadı." };

    const identity = await getIdentity(true);
    const where = identity.userId
      ? { articleId_userId: { articleId: article.id, userId: identity.userId } }
      : { articleId_visitorId: { articleId: article.id, visitorId: identity.visitorId! } };

    const existing = await prisma.articleReaction.findUnique({ where, select: { type: true } });
    if (reaction.data === null || existing?.type === reaction.data) {
      if (existing) await prisma.articleReaction.delete({ where });
    } else {
      await prisma.articleReaction.upsert({
        where,
        update: { type: reaction.data },
        create: {
          articleId: article.id,
          type: reaction.data,
          userId: identity.userId,
          visitorId: identity.visitorId,
        },
      });
    }

    return { success: true as const, summary: await summarize(article.id, identity) };
  } catch (error) {
    if (isMissingTable(error)) return { success: false as const, error: "Tepkiler şu anda kullanılamıyor." };
    console.error("setArticleReaction error:", error);
    return { success: false as const, error: "Tepkiniz kaydedilemedi." };
  }
}
