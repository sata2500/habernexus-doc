"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Updates the user's custom bio field in the database.
 */
export async function updateUserBio(userId: string, bio: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { bio },
    });
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating bio:", error);
    return { success: false, error: "Biyografi güncellenemedi." };
  }
}

/**
 * Toggles a bookmark for a user and an article.
 * Validates if the bookmark exists, if so deletes it, if not creates it.
 */
export async function toggleBookmark(userId: string, articleId: string) {
  try {
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { id: existing.id },
      });
    } else {
      await prisma.bookmark.create({
        data: {
          userId,
          articleId,
        },
      });
    }

    revalidatePath("/dashboard/bookmarks");
    // Also revalidate the specific article page to update the icon state
    // Note: To dynamically revalidate that page we need the slug, 
    // but the layout will refresh automatically if we use router.refresh() on the client.
    return { success: true, isBookmarked: !existing };
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return { success: false, error: "Kaydedilenler güncellenemedi." };
  }
}

/**
 * Fetches user bookmarks dynamically.
 */
export async function getUserBookmarks(userId: string) {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        article: {
          include: { category: true, author: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return bookmarks;
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return [];
  }
}

/**
 * Checks if a specific article is bookmarked by the user.
 */
export async function checkIsBookmarked(userId: string, articleId: string) {
  try {
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });
    return !!existing;
  } catch (error) {
    return false;
  }
}

/**
 * Fetches user stats (e.g. total bookmarks, days since join).
 */
export async function getUserStats(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, bio: true, _count: { select: { bookmarks: true } } },
    });
    
    if (!user) return null;

    const daysSinceJoin = Math.max(1, Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      totalBookmarks: user._count.bookmarks,
      daysSinceJoin,
      bio: user.bio,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Permanently deletes the current user's own account.
 */
export async function deleteAccount() {
  try {
    const { headers } = await import("next/headers");
    const { auth } = await import("@/lib/auth");
    
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    // Kullanıcıyı veritabanından sil (Cascade delete diğer tabloları temizler)
    await prisma.user.delete({
      where: { id: session.user.id }
    });

    // Not: Better-Auth session cookie'si veritabanından silindiği için 
    // bir sonraki istekte kullanıcı zaten çıkış yapmış sayılacaktır.
    return { success: true };
  } catch (error) {
    console.error("Account deletion error:", error);
    return { success: false, error: "Hesap silinirken bir hata oluştu." };
  }
}

/**
 * Fetches all comments made by a specific user.
 */
export async function getUserComments(userId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: { userId },
      include: {
        article: { select: { title: true, slug: true } },
        user: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return comments;
  } catch (error) {
    console.error("Error fetching user comments:", error);
    return [];
  }
}

/**
 * Deletes a user's own comment.
 */
export async function deleteUserComment(id: string) {
  try {
    const { headers } = await import("next/headers");
    const { auth } = await import("@/lib/auth");
    
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment || comment.userId !== session.user.id) {
      return { success: false, error: "Bu yorumu silme yetkiniz yok." };
    }

    await prisma.comment.delete({
      where: { id },
    });

    revalidatePath("/dashboard/comments");
    return { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: "Yorum silinirken bir hata oluştu." };
  }
}

/**
 * Toggles the user's newsletter subscription status.
 */
export async function updateNewsletterSubscription(subscribed: boolean) {
  try {
    const { headers } = await import("next/headers");
    const { auth } = await import("@/lib/auth");
    
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session?.user) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { newsletterSubscribed: subscribed },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating newsletter preference:", error);
    return { success: false, error: "Abonelik tercihi güncellenemedi." };
  }
}
