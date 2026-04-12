"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getComments(articleId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: { articleId, parentId: null },
      include: {
        user: { select: { id: true, name: true, image: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, image: true } },
            replies: true, // Only 2 levels deep for nested replies in simple fetch
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return comments;
  } catch (error) {
    console.error("Fetch comments error:", error);
    return [];
  }
}

export async function addComment(data: {
  articleId: string;
  userId: string;
  content: string;
  parentId?: string;
}) {
  try {
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        articleId: data.articleId,
        userId: data.userId,
        parentId: data.parentId || null,
      },
      include: {
        user: { select: { name: true, image: true } },
      },
    });

    revalidatePath(`/article/[slug]`, "page");
    return { success: true, comment };
  } catch (error) {
    console.error("Add comment error:", error);
    return { success: false, error: "Yorum gönderilemedi." };
  }
}

export async function deleteComment(commentId: string, userId: string) {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.userId !== userId) {
      return { success: false, error: "Bu yorumu silme yetkiniz yok." };
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    revalidatePath(`/article/[slug]`, "page");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Silme işlemi sırasında hata oluştu." };
  }
}
