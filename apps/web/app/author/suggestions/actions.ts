"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAuthorSuggestions() {
  return prisma.rssFeedItem.findMany({
    where: {
      status: { in: ["ANALYZED", "APPROVED"] },
      dismissed: false,
      usedForArticle: false,
    },
    orderBy: [
      { status: "desc" }, // APPROVED (Ap) comes before ANALYZED (An) in descending order.
      { aiScore: "desc" }
    ],
    take: 20,
    include: {
      source: { select: { name: true } },
    },
  });
}

export async function dismissSuggestionByAuthor(id: string) {
  await prisma.rssFeedItem.update({
    where: { id },
    data: { status: "DISMISSED", dismissed: true },
  });
  revalidatePath("/author/suggestions");
  revalidatePath("/author");
  return { success: true };
}

export async function markSuggestionAsUsed(id: string) {
  await prisma.rssFeedItem.update({
    where: { id },
    data: { usedForArticle: true },
  });
  revalidatePath("/author/suggestions");
  revalidatePath("/author");
  return { success: true };
}
