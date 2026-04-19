"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Kullanıcının session'ını doğrular ve döner.
 * Tüm mutation'larda bu helper kullanılmalıdır.
 */
async function getVerifiedSession() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user) {
    throw new Error("Yetkisiz işlem. Lütfen giriş yapın.");
  }
  return session;
}

/**
 * Updates the user's custom bio field in the database.
 * Güvenlik: userId artık session'dan alınıyor — IDOR kapatıldı.
 */
export async function updateUserBio(bio: string) {
  try {
    const session = await getVerifiedSession();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { bio },
    });
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Biyografi güncellenemedi.";
    console.error("Error updating bio:", err);
    return { success: false, error: message };
  }
}

/**
 * Toggles a bookmark for a user and an article.
 * Güvenlik: userId session'dan alınıyor — IDOR kapatıldı.
 */
export async function toggleBookmark(articleId: string) {
  try {
    const session = await getVerifiedSession();
    const userId = session.user.id;

    const existing = await prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
    } else {
      await prisma.bookmark.create({ data: { userId, articleId } });
    }

    revalidatePath("/dashboard/bookmarks");
    return { success: true, isBookmarked: !existing };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kaydedilenler güncellenemedi.";
    console.error("Error toggling bookmark:", err);
    return { success: false, error: message };
  }
}

/**
 * Fetches user bookmarks dynamically.
 * Güvenlik: userId session'dan alınıyor — IDOR kapatıldı.
 */
export async function getUserBookmarks() {
  try {
    const session = await getVerifiedSession();
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: session.user.id },
      include: {
        article: { include: { category: true, author: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return bookmarks;
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    return [];
  }
}

/**
 * Checks if a specific article is bookmarked by the current user.
 * Güvenlik: userId session'dan alınıyor — IDOR kapatıldı.
 */
export async function checkIsBookmarked(articleId: string) {
  try {
    const session = await getVerifiedSession();
    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_articleId: { userId: session.user.id, articleId },
      },
    });
    return !!existing;
  } catch {
    return false;
  }
}

/**
 * Fetches user stats (e.g. total bookmarks, days since join).
 * Güvenlik: userId session'dan alınıyor — IDOR kapatıldı.
 */
export async function getUserStats() {
  try {
    const session = await getVerifiedSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true, bio: true, _count: { select: { bookmarks: true } } },
    });

    if (!user) return null;

    const daysSinceJoin = Math.max(
      1,
      Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      totalBookmarks: user._count.bookmarks,
      daysSinceJoin,
      bio: user.bio,
    };
  } catch {
    return null;
  }
}

/**
 * Permanently deletes the current user's own account.
 */
export async function deleteAccount() {
  try {
    const session = await getVerifiedSession();
    // Kullanıcıyı veritabanından sil (Cascade delete diğer tabloları temizler)
    await prisma.user.delete({ where: { id: session.user.id } });
    // Not: Better-Auth session cookie'si veritabanından silindiği için
    // bir sonraki istekte kullanıcı zaten çıkış yapmış sayılacaktır.
    return { success: true };
  } catch (err) {
    console.error("Account deletion error:", err);
    return { success: false, error: "Hesap silinirken bir hata oluştu." };
  }
}

/**
 * Fetches all comments made by the current user.
 * Güvenlik: userId session'dan alınıyor — IDOR kapatıldı.
 */
export async function getUserComments() {
  try {
    const session = await getVerifiedSession();
    const comments = await prisma.comment.findMany({
      where: { userId: session.user.id },
      include: {
        article: { select: { title: true, slug: true } },
        user: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return comments;
  } catch (err) {
    console.error("Error fetching user comments:", err);
    return [];
  }
}

/**
 * Deletes a user's own comment.
 */
export async function deleteUserComment(id: string) {
  try {
    const session = await getVerifiedSession();

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment || comment.userId !== session.user.id) {
      return { success: false, error: "Bu yorumu silme yetkiniz yok." };
    }

    await prisma.comment.delete({ where: { id } });
    revalidatePath("/dashboard/comments");
    return { success: true };
  } catch (err) {
    console.error("Error deleting comment:", err);
    return { success: false, error: "Yorum silinirken bir hata oluştu." };
  }
}

export async function updateNewsletterSubscription(subscribed: boolean) {
  try {
    const session = await getVerifiedSession();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { newsletterSubscribed: subscribed },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    console.error("Error updating newsletter preference:", err);
    return { success: false, error: "Abonelik tercihi güncellenemedi." };
  }
}

/**
 * Kullanıcının bülten maili alma saatini günceller.
 */
export async function updateNewsletterTime(time: string) {
  try {
    const session = await getVerifiedSession();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { newsletterTime: time },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    console.error("Error updating newsletter time:", err);
    return { success: false, error: "Saat tercihi güncellenemedi." };
  }
}

/**
 * Kullanıcıya hemen anında bir test maili gönderir.
 */
import { sendEmail } from "@/lib/mail";
import { NewsletterTemplate } from "@/components/mail/NewsletterTemplate";

export async function testNewsletterEmail() {
  try {
    const session = await getVerifiedSession();
    
    // Test için son 3 haberi alalım
    const latestArticles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      take: 3,
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true } } },
    });

    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com";
    const unsubscribeUrl = `${BASE_URL}/dashboard/settings`;

    const result = await sendEmail({
      to: session.user.email,
      subject: `Haber Nexus — Test Bülteni`,
      react: NewsletterTemplate({ articles: latestArticles, unsubscribeUrl }),
    });

    if (result.success) {
      return { success: true, message: "Test e-postası başarıyla gönderildi." };
    } else {
      return { success: false, error: "Resend hatası: " + (result.error || "Bilinmeyen hata") };
    }
  } catch (err) {
    console.error("Test email error:", err);
    return { success: false, error: "E-posta gönderimi başarısız oldu." };
  }
}
