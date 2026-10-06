import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/client";

/**
 * Yapay zekâ düzeltmesinden önceki metin ve analiz sonuçları. Düzeltme kopya oranını
 * düşürmediyse haber bu hâline geri döndürülür (kötüleşen metin yayında kalmaz).
 */
export async function takeContentSnapshot(articleId: string) {
  return prisma.article.findUnique({
    where: { id: articleId },
    select: { content: true, plagiarismRate: true, seoScore: true, readabilityScore: true, qualityScore: true, analysisReport: true },
  });
}

export type ContentSnapshot = NonNullable<Awaited<ReturnType<typeof takeContentSnapshot>>>;

export async function restoreContentSnapshot(articleId: string, snap: ContentSnapshot) {
  const updated = await prisma.article.update({
    where: { id: articleId },
    data: {
      content: snap.content,
      plagiarismRate: snap.plagiarismRate,
      seoScore: snap.seoScore,
      readabilityScore: snap.readabilityScore,
      qualityScore: snap.qualityScore,
      ...(snap.analysisReport !== null && { analysisReport: snap.analysisReport as Prisma.InputJsonValue }),
    },
    select: { slug: true },
  });
  return updated.slug;
}
