"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { actionError, requireSession } from "@/lib/server/authz";
import type { ActionResult } from "@/lib/types";
import { feedSelect, toFeedArticle } from "@/lib/feed";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { NewsletterTimeSchema } from "@/lib/validation/schemas";
import { deleteAccountSafely } from "@/lib/server/account-deletion";
import { clearReads, removeRead } from "@/lib/server/reading-history";
import { sendEmail } from "@/lib/mail";
import { NewsletterTemplate } from "@/components/mail/NewsletterTemplate";
import { newsletterDateLabel, newsletterLink, newsletterSubject, newsletterText, selectNewsletterArticles } from "@/lib/newsletter-content";
import { userUnsubscribeUrl } from "@/lib/newsletter-links";
import { readingMinutes } from "@/lib/utils";

const MAX_BIO_LENGTH = 1000;

/*
 * Okur paneli işlemleri. Kullanıcı kimliği her zaman oturumdan alınır (istemciden gelen kimliğe güvenilmez).
 */

/** Profil biyografisi (yazar sayfalarında ve haber altındaki yazar kartında görünür) */
export async function updateUserBio(bio: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (typeof bio !== "string" || bio.length > MAX_BIO_LENGTH) {
      return { success: false, error: `Biyografi en fazla ${MAX_BIO_LENGTH} karakter olabilir.` };
    }
    await prisma.user.update({ where: { id: session.user.id }, data: { bio: bio.trim() || null } });
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (err) {
    return actionError(err, "Biyografi güncellenemedi.");
  }
}

/** Haberi kaydeder ya da kayıttan çıkarır */
export async function toggleBookmark(articleId: string): Promise<{ success: true; isBookmarked: boolean } | { success: false; error: string }> {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    if (typeof articleId !== "string" || articleId.length > 100) return { success: false, error: "Geçersiz haber." };

    const existing = await prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
    } else {
      // Yalnızca yayındaki haberler kaydedilebilir (taslak haberlerin varlığı sızdırılmaz)
      const article = await prisma.article.findFirst({ where: { id: articleId, status: "PUBLISHED" }, select: { id: true } });
      if (!article) return { success: false, error: "Haber bulunamadı." };
      await prisma.bookmark.create({ data: { userId, articleId } });
    }

    revalidatePath("/dashboard/bookmarks");
    return { success: true, isBookmarked: !existing };
  } catch (err) {
    return actionError(err, "Kaydedilenler güncellenemedi.");
  }
}

/** Kaydedilen (ve hâlâ yayında olan) haberler, kart verisiyle */
export async function getUserBookmarks() {
  try {
    const session = await requireSession();
    const rows = await prisma.bookmark.findMany({
      where: { userId: session.user.id, article: { status: "PUBLISHED" } },
      select: { id: true, createdAt: true, article: { select: feedSelect } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, article: toFeedArticle(r.article) }));
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    return [];
  }
}

/** Haber, oturumdaki kullanıcı tarafından kaydedilmiş mi? */
export async function checkIsBookmarked(articleId: string) {
  try {
    if (typeof articleId !== "string" || !articleId || articleId.length > 100) return false;
    const session = await requireSession();
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

/** Hesabı kalıcı olarak siler */
export async function deleteAccount(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    // Son yönetici silinemez; yazılan haberler yöneticiye devredilir. Oturumlar ilişkiyle birlikte silinir.
    const result = await deleteAccountSafely(session.user.id);
    if (!result.success) return result;
    return { success: true };
  } catch (err) {
    return actionError(err, "Hesap silinirken bir hata oluştu.");
  }
}

/** Kullanıcının yorumları (en yeni 200) */
export async function getUserComments() {
  try {
    const session = await requireSession();
    const comments = await prisma.comment.findMany({
      where: { userId: session.user.id },
      include: {
        article: { select: { title: true, slug: true } },
        user: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return comments;
  } catch (err) {
    console.error("Error fetching user comments:", err);
    return [];
  }
}

/** Kullanıcının kendi yorumunu siler */
export async function deleteUserComment(id: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (typeof id !== "string" || !id || id.length > 100) return { success: false, error: "Geçersiz yorum." };
    const comment = await prisma.comment.findUnique({ where: { id }, select: { userId: true, article: { select: { slug: true } } } });

    if (!comment || comment.userId !== session.user.id) {
      return { success: false, error: "Bu yorumu silme yetkiniz yok." };
    }

    await prisma.comment.delete({ where: { id } });
    revalidatePath("/dashboard/comments");
    revalidatePath(`/article/${comment.article.slug}`);
    return { success: true };
  } catch (err) {
    return actionError(err, "Yorum silinirken bir hata oluştu.");
  }
}

/** Günlük bülten aboneliği (açık onay) */
export async function updateNewsletterSubscription(subscribed: boolean): Promise<ActionResult> {
  try {
    if (typeof subscribed !== "boolean") return { success: false, error: "Geçersiz istek." };
    const session = await requireSession();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { newsletterSubscribed: subscribed },
    });

    // Çifte e-posta gitmesini engelle (Deduplication)
    if (subscribed && session.user.email) {
      await prisma.subscriber.updateMany({
        where: { email: session.user.email.toLowerCase() },
        data: { isActive: false },
      });
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    return actionError(err, "Abonelik tercihi güncellenemedi.");
  }
}

/** Bültenin geleceği saat (Türkiye saatiyle, saat başı) */
export async function updateNewsletterTime(time: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsedTime = NewsletterTimeSchema.safeParse(time);
    // Bülten cron'u saat başı çalışır; dakikalı saatler hiçbir zaman eşleşmez
    if (!parsedTime.success || !parsedTime.data.endsWith(":00")) {
      return { success: false, error: "Geçerli bir saat seçin." };
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { newsletterTime: parsedTime.data },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    return actionError(err, "Saat tercihi güncellenemedi.");
  }
}

/** Kullanıcıya bültenin bir örneğini hemen gönderir (saatte en fazla 3) */
export async function testNewsletterEmail(): Promise<ActionResult> {
  try {
    const session = await requireSession();

    const rate = await checkRateLimitAsync(`test-newsletter:${session.user.id}`, 3, 60 * 60 * 1000);
    if (!rate.allowed) {
      return { success: false, error: "Çok fazla test e-postası istendi. Lütfen daha sonra tekrar deneyin." };
    }

    // Gerçek bültenle aynı seçim; son 48 saatte haber yoksa en yeni 3 haber
    let articles = await selectNewsletterArticles(5);
    if (articles.length === 0) {
      const latest = await prisma.article.findMany({
        where: { status: "PUBLISHED" },
        take: 3,
        orderBy: { publishedAt: "desc" },
        select: { title: true, excerpt: true, slug: true, coverImage: true, content: true, category: { select: { name: true } } },
      });
      articles = latest.map(({ content, ...a }) => ({ ...a, readingMinutes: readingMinutes(content) }));
    }

    const unsubscribeUrl = userUnsubscribeUrl(session.user.id);
    const settingsUrl = newsletterLink("/dashboard/settings", "test");
    const dateLabel = newsletterDateLabel();
    const result = await sendEmail({
      to: session.user.email,
      subject: `[Deneme] ${newsletterSubject(articles)}`,
      react: NewsletterTemplate({ articles, unsubscribeUrl, settingsUrl, dateLabel, link: (p) => newsletterLink(p, "test"), isTest: true }),
      text: newsletterText(articles, { unsubscribeUrl, settingsUrl, dateLabel }),
    });

    if (result.success) {
      return { success: true, message: "Test e-postası başarıyla gönderildi." };
    } else {
      console.error("Test bülteni gönderilemedi:", result.error);
      return { success: false, error: "Test e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin." };
    }
  } catch (err) {
    return actionError(err, "E-posta gönderimi başarısız oldu.");
  }
}

/** Okuma geçmişinden tek bir haberi kaldırır (yalnızca oturum sahibinin kaydı). */
export async function removeReadingHistoryItem(articleId: string): Promise<ActionResult> {
  try {
    if (typeof articleId !== "string" || !articleId || articleId.length > 100) return { success: false, error: "Geçersiz haber." };
    const session = await requireSession();
    await removeRead(session.user.id, articleId);
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (err) {
    return actionError(err, "Geçmişten kaldırılamadı.");
  }
}

/** Okuma geçmişinin tamamını siler. */
export async function clearReadingHistory(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await clearReads(session.user.id);
    revalidatePath("/dashboard/history");
    return { success: true };
  } catch (err) {
    return actionError(err, "Geçmiş temizlenemedi.");
  }
}
