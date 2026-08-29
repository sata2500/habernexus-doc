"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/server/authz";

export async function getAuthorSuggestions() {
  await requireRole("AUTHOR", "ADMIN");
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
  await requireRole("AUTHOR", "ADMIN");
  await prisma.rssFeedItem.update({
    where: { id },
    data: { status: "DISMISSED", dismissed: true },
  });
  revalidatePath("/author/suggestions");
  revalidatePath("/author");
  return { success: true };
}

export async function markSuggestionAsUsed(id: string) {
  await requireRole("AUTHOR", "ADMIN");
  await prisma.rssFeedItem.update({
    where: { id },
    data: { usedForArticle: true },
  });
  revalidatePath("/author/suggestions");
  revalidatePath("/author");
  return { success: true };
}
