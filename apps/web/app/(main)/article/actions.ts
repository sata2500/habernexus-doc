"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { checkCommentToxicity, generateCommentsSummary } from "@/lib/comment-ai";
import { requireSession } from "@/lib/server/authz";
import { CommentIdSchema, CommentInputSchema } from "@/lib/validation/schemas";

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getComments(articleId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: { articleId, parentId: null },
      include: {
        user: { select: { id: true, name: true, image: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, image: true } },
            replies: true,
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
  content: string;
  parentId?: string;
}) {
  try {
    const session = await requireSession();
    const parsed = CommentInputSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Geçersiz yorum." };
    }

    const input = parsed.data;
    // Yorum seli ve yapay zekâ moderasyon maliyeti: kullanıcı başına 10 dakikada 10 yorum
    const rate = await checkRateLimitAsync(`comment:${session.user.id}`, 10, 10 * 60 * 1000);
    if (!rate.allowed) return { success: false, error: "Çok sık yorum gönderdiniz. Lütfen biraz sonra tekrar deneyin." };
    const article = await prisma.article.findFirst({
      where: { id: input.articleId, status: "PUBLISHED" },
      select: { id: true, slug: true },
    });

    if (!article) {
      return { success: false, error: "Makale bulunamadı." };
    }

    if (input.parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: input.parentId, articleId: input.articleId },
        select: { id: true },
      });

      if (!parent) {
        return { success: false, error: "Yanıtlanacak yorum bulunamadı." };
      }
    }

    const moderation = await checkCommentToxicity(input.content);
    if (moderation.isToxic) {
      return {
        success: false,
        error: `Yorumunuz yapay zeka moderasyonu tarafından elendi: ${moderation.reason}`,
      };
    }

    const comment = await prisma.comment.create({
      data: {
        content: input.content,
        articleId: input.articleId,
        userId: session.user.id,
        parentId: input.parentId || null,
      },
      include: {
        user: { select: { name: true, image: true } },
      },
    });

    // Okur yorum özeti: 3. yorumda ve sonra her 5 yorumda bir, yanıtı bekletmeden arka planda güncellenir
    const totalCommentsCount = await prisma.comment.count({ where: { articleId: input.articleId } });
    if (totalCommentsCount === 3 || (totalCommentsCount > 3 && totalCommentsCount % 5 === 0)) {
      after(async () => {
        try {
          const summary = await generateCommentsSummary(input.articleId);
          if (!summary) return;
          const current = await prisma.article.findUnique({ where: { id: input.articleId }, select: { analysisReport: true, updatedAt: true } });
          const oldReport = isJsonObject(current?.analysisReport) ? current.analysisReport : {};
          await prisma.article.update({
            where: { id: input.articleId },
            data: {
              analysisReport: JSON.parse(JSON.stringify({ ...oldReport, commentsSummary: summary, commentsSummaryUpdatedAt: new Date().toISOString() })),
              updatedAt: current?.updatedAt, // yorum özeti haberin güncellenme tarihini değiştirmez
            },
          });
          revalidatePath(`/article/${article.slug}`);
        } catch (e) {
          console.error("Yorum özeti hatası:", e);
        }
      });
    }

    // Yalnızca bu haberin sayfası yenilenir (önceden tüm haber sayfalarının önbelleği siliniyordu)
    revalidatePath(`/article/${article.slug}`);
    return { success: true, comment };
  } catch (error) {
    console.error("Add comment error:", error);
    return {
      success: false,
      error: error instanceof Error && error.message !== "UNAUTHORIZED"
        ? error.message
        : "Yorum gönderilemedi.",
    };
  }
}

export async function deleteComment(commentId: string) {
  try {
    const session = await requireSession();
    const parsedId = CommentIdSchema.safeParse(commentId);

    if (!parsedId.success) {
      return { success: false, error: "Geçersiz yorum." };
    }

    const comment = await prisma.comment.findUnique({
      where: { id: parsedId.data },
      select: { id: true, userId: true, article: { select: { slug: true } } },
    });

    if (!comment || comment.userId !== session.user.id) {
      return { success: false, error: "Bu yorumu silme yetkiniz yok." };
    }

    await prisma.comment.delete({ where: { id: comment.id } });

    revalidatePath(`/article/${comment.article.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Delete comment error:", error);
    return { success: false, error: "Silme işlemi sırasında hata oluştu." };
  }
}
