"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkCommentToxicity, generateCommentsSummary } from "@/lib/comment-ai";

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
    // 1. AI Yorum Moderasyonu (Toksisite Kontrolü)
    const moderation = await checkCommentToxicity(data.content);
    if (moderation.isToxic) {
      return { 
        success: false, 
        error: `Yorumunuz yapay zeka moderasyonu tarafından elendi: ${moderation.reason}` 
      };
    }

    // 2. Yorum Oluşturma
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

    // 3. AI Yorum Özetleyici Tetikleme (Eğer >= 3 yorum varsa)
    const totalCommentsCount = await prisma.comment.count({
      where: { articleId: data.articleId }
    });

    if (totalCommentsCount >= 3) {
      const summary = await generateCommentsSummary(data.articleId);
      if (summary) {
        // Makaleyi çekip mevcut analysisReport'u güncelle
        const article = await prisma.article.findUnique({
          where: { id: data.articleId },
          select: { analysisReport: true }
        });
        
        const oldReport = (article?.analysisReport as Record<string, any>) || {};
        
        await prisma.article.update({
          where: { id: data.articleId },
          data: {
            analysisReport: {
              ...oldReport,
              commentsSummary: summary,
              commentsSummaryUpdatedAt: new Date().toISOString()
            }
          }
        });
      }
    }

    revalidatePath(`/article/[slug]`, "page");
    return { success: true, comment };
  } catch (error) {
    console.error("Add comment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Yorum gönderilemedi." };
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
  } catch {
    return { success: false, error: "Silme işlemi sırasında hata oluştu." };
  }
}
