"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, requireRole } from "@/lib/server/authz";
import type { ActionResult } from "@/lib/types";
import { syncArticleTags, uniqueArticleSlug } from "@/lib/news/seo";
import { analyzeArticle } from "@/lib/article-analyzer";
import { rewriteArticleWithAI } from "@/lib/ai-writer";
import { checkRateLimitAsync, getActionIdentity } from "@/lib/server/rate-limit";
import { invalidateArticle } from "@/lib/server/article-cache";


const ArticleInputSchema = z.object({
  title: z.string().trim().min(5, "Başlık en az 5 karakter olmalı.").max(200, "Başlık en fazla 200 karakter olabilir."),
  excerpt: z.string().trim().max(300, "Özet en fazla 300 karakter olabilir.").optional().default(""),
  content: z.string().max(200_000, "İçerik çok uzun."),
  coverImage: z.string().trim().max(2000).optional().default("")
    .refine((v) => !v || /^https?:\/\//i.test(v) || v.startsWith("/"), "Kapak görseli adresi geçersiz."),
  categoryId: z.string().trim().max(100).optional().default(""),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  /** Karar Merkezi önerisinden yazılıyorsa konu kimliği */
  storyId: z.string().trim().max(100).optional(),
  tags: z.array(z.string().max(60)).max(10).optional(),
  /** Editör açıldığında haberin son güncellenme zamanı: arada başka biri kaydettiyse üzerine yazılmaz */
  expectedUpdatedAt: z.string().datetime().optional(),
});

export type ArticleInput = z.input<typeof ArticleInputSchema>;
type SaveResult =
  | { success: true; id: string; slug: string; status: "DRAFT" | "PUBLISHED"; updatedAt: string; tags: string[] }
  | { success: false; error: string; conflict?: boolean };

function plainTextLength(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().length;
}

/**
 * Haberi oluşturur ya da günceller. Yayınlamak için kategori ve en az 50 karakterlik metin gerekir;
 * taslakta bu alanlar boş kalabilir. Yazar yalnızca kendi haberini değiştirebilir.
 */
export async function saveArticle(id: string | null, input: ArticleInput): Promise<SaveResult> {
  let session;
  try {
    session = await requireRole("AUTHOR", "ADMIN");
  } catch {
    return { success: false, error: "Bu işlem için yetkiniz yok." };
  }
  const parsed = ArticleInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi." };
  const data = parsed.data;

  const textLength = plainTextLength(data.content);
  if (data.status === "PUBLISHED") {
    if (!data.categoryId) return { success: false, error: "Yayınlamak için bir kategori seçin." };
    if (textLength < 50) return { success: false, error: "Yayınlamak için haber metni en az 50 karakter olmalı." };
  } else if (textLength === 0 && !data.title) {
    return { success: false, error: "Boş taslak kaydedilemez." };
  }
  if (data.categoryId && !(await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }))) {
    return { success: false, error: "Seçilen kategori bulunamadı." };
  }

  try {
    const existing = id
      ? await prisma.article.findUnique({ where: { id }, select: { id: true, authorId: true, slug: true, status: true, publishedAt: true, updatedAt: true, lang: true } })
      : null;
    if (id && !existing) return { success: false, error: "Haber bulunamadı." };
    if (existing && session.user.role !== "ADMIN" && existing.authorId !== session.user.id) {
      return { success: false, error: "Bu haberi düzenleme yetkiniz yok." };
    }
    // Eşzamanlı düzenleme: editör açıldıktan sonra haber başka bir yerde (başka sekme, yönetici,
    // yapay zekâ özgünleştirmesi) değiştiyse sessizce üzerine yazılmaz
    if (existing && data.expectedUpdatedAt && existing.updatedAt.getTime() > new Date(data.expectedUpdatedAt).getTime() + 1000) {
      return {
        success: false,
        conflict: true,
        error: "Bu haber siz düzenlerken başka bir yerde güncellendi. Değişikliklerinizi kopyalayıp sayfayı yenileyin; ardından tekrar kaydedin.",
      };
    }

    const fields = {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage || null,
      categoryId: data.categoryId || null,
      status: data.status,
    };

    const article = existing
      ? await prisma.article.update({
          where: { id: existing.id },
          data: { ...fields, ...(data.status === "PUBLISHED" && !existing.publishedAt ? { publishedAt: new Date() } : {}) },
          select: { id: true, slug: true, status: true },
        })
      : await prisma.article.create({
          data: {
            ...fields,
            // Kısa ve okunur adres (çakışırsa kısa ek alır)
            slug: await uniqueArticleSlug(data.title),
            authorId: session.user.id,
            publishedAt: data.status === "PUBLISHED" ? new Date() : null,
          },
          select: { id: true, slug: true, status: true },
        });

    const tags = data.tags ? await syncArticleTags(article.id, data.tags, existing?.lang ?? "tr") : [];
    // Etiket değişikliği haberin güncellenme zamanını değiştirmez; editöre güncel zaman döner
    const { updatedAt } = await prisma.article.findUniqueOrThrow({ where: { id: article.id }, select: { updatedAt: true } });

    // Öneriden yazıldıysa Karar Merkezi'ndeki konu bu habere bağlanır (AI Yazar tekrar yazmaz)
    if (data.storyId && data.status === "PUBLISHED") {
      await prisma.newsStory.updateMany({
        where: { id: data.storyId, articleId: null, status: { notIn: ["WRITING", "PUBLISHED"] } },
        data: { status: "PUBLISHED", articleId: article.id, reason: `${session.user.name ?? "Bir yazar"} tarafından yazıldı`, pinned: false },
      });
    }

    const { notifyGoogle, getArticleUrl } = await import("@/lib/google-indexing");
    if (article.status === "PUBLISHED") {
      after(() => notifyGoogle(getArticleUrl(article.slug), "URL_UPDATED").catch((err) => console.error("Google Indexing Error:", err)));
    } else if (existing?.status === "PUBLISHED") {
      after(() => notifyGoogle(getArticleUrl(existing.slug), "URL_DELETED").catch((err) => console.error("Google Indexing Error:", err)));
    }

    revalidatePath("/author", "layout");
    await invalidateArticle(article.slug);
    return { success: true, id: article.id, slug: article.slug, status: article.status as "DRAFT" | "PUBLISHED", updatedAt: updatedAt.toISOString(), tags };
  } catch (err) {
    console.error("Haber kaydetme hatası:", err);
    return { success: false, error: "Haber kaydedilemedi. Lütfen tekrar deneyin." };
  }
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  try {
    const session = await requireRole("AUTHOR", "ADMIN");
    if (typeof id !== "string" || !id || id.length > 100) return { success: false, error: "Geçersiz haber." };
    const article = await prisma.article.findUnique({ where: { id }, select: { authorId: true, status: true, slug: true } });

    if (!article) {
      return { success: false, error: "Makale bulunamadı." };
    }

    if (session.user.role !== "ADMIN" && article.authorId !== session.user.id) {
      return { success: false, error: "Bu makaleyi silme yetkiniz yok." };
    }

    await prisma.article.delete({
      where: { id },
    });

    if (article && article.status === "PUBLISHED") {
      const { notifyGoogle, getArticleUrl } = await import("@/lib/google-indexing");
      after(() => notifyGoogle(getArticleUrl(article.slug), "URL_DELETED").catch(err => console.error("Google Indexing Error:", err)));
    }

    revalidatePath("/author", "layout");
    await invalidateArticle(article.slug);

    return { success: true };
  } catch (err) {
    return actionError(err, "Silme işlemi sırasında hata oluştu.");
  }
}

export async function incrementViewCount(id: string) {
  try {
    if (typeof id !== "string" || id.length === 0 || id.length > 100) return { success: false };

    // Aynı IP'nin aynı haberi tekrar tekrar sayması (görüntülenme şişirme) engellenir
    const rate = await checkRateLimitAsync(`view:${await getActionIdentity()}:${id}`, 1, 30 * 60 * 1000);
    if (!rate.allowed) return { success: true };

    // Ham SQL: Prisma'nın @updatedAt alanını değiştirmemesi için. Aksi halde her görüntülenme haberin
    // "güncellenme tarihini" (Google'a bildirilen dateModified ve site haritası lastmod) bozuyordu.
    await prisma.$executeRaw`UPDATE "Article" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${id} AND "status" = 'PUBLISHED'`;
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Yazarın kendi makalelerine gelen yorumları getir
export async function getAuthorComments() {
  try {
    const session = await requireRole("AUTHOR", "ADMIN").catch(() => null);
    if (!session) return [];

    return await prisma.comment.findMany({
      where: {
        article: {
          authorId: session.user.id,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, image: true } },
        article: { select: { title: true, slug: true } },
      },
    });
  } catch {
    return [];
  }
}

// Yazarın makalesine ait bir yorumu yazarın kendisinin silmesi
export async function deleteCommentByAuthor(id: string): Promise<ActionResult> {
  try {
    const session = await requireRole("AUTHOR", "ADMIN");
    if (typeof id !== "string" || !id || id.length > 100) return { success: false, error: "Geçersiz yorum." };
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { article: { select: { authorId: true, slug: true } } },
    });

    if (!comment) {
      return { success: false, error: "Yorum bulunamadı." };
    }

    // Yetki kontrolü: Ya Admin ya da makalenin asıl yazarı
    if (session.user.role !== "ADMIN" && comment.article.authorId !== session.user.id) {
      return { success: false, error: "Bu yorumu silme yetkiniz yok." };
    }

    await prisma.comment.delete({
      where: { id },
    });

    revalidatePath("/author", "layout");
    revalidatePath(`/article/${comment.article.slug}`);
    return { success: true };
  } catch (err) {
    return actionError(err, "Yorum silinirken bir hata oluştu.");
  }
}

/** Yazar yalnızca kendi haberinde, yönetici her haberde yapay zekâ araçlarını kullanabilir */
async function authorizeArticle(articleId: string) {
  const session = await requireRole("AUTHOR", "ADMIN");
  if (typeof articleId !== "string" || !articleId || articleId.length > 100) return { session, error: "Geçersiz haber." };
  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { authorId: true } });
  if (!article) return { session, error: "Haber bulunamadı." };
  if (session.user.role !== "ADMIN" && article.authorId !== session.user.id) return { session, error: "Bu haber üzerinde işlem yapma yetkiniz yok." };
  return { session, error: null };
}

/** Yapay zekâ maliyeti: kişi başına saatlik sınırlar */
async function aiQuota(kind: string, userId: string, perHour: number) {
  const rate = await checkRateLimitAsync(`${kind}:${userId}`, perHour, 60 * 60 * 1000);
  return rate.allowed ? null : "Çok sık istendi. Lütfen biraz sonra tekrar deneyin.";
}

export async function analyzeArticleAction(articleId: string) {
  try {
    const { session, error } = await authorizeArticle(articleId);
    if (error) return { success: false as const, error };
    const quota = await aiQuota("analyze", session.user.id, 20);
    if (quota) return { success: false as const, error: quota };
    const res = await analyzeArticle(articleId);
    revalidatePath("/author/articles");
    return res;
  } catch (err) {
    return actionError(err, "Analiz yapılamadı.");
  }
}

export async function rewriteArticleWithAIAction(articleId: string) {
  try {
    const { session, error } = await authorizeArticle(articleId);
    if (error) return { success: false as const, error };
    const quota = await aiQuota("rewrite", session.user.id, 10);
    if (quota) return { success: false as const, error: quota };
    const res = await rewriteArticleWithAI(articleId);
    revalidatePath("/author/articles");
    return res;
  } catch (err) {
    return actionError(err, "Yeniden yazım yapılamadı.");
  }
}

/** Kaynaklardan aynen alınmış bölümleri özgünleştirir */
export async function fixCopiedPassagesAction(articleId: string) {
  try {
    const { session, error } = await authorizeArticle(articleId);
    if (error) return { success: false as const, error };
    const quota = await aiQuota("fixcopies", session.user.id, 10);
    if (quota) return { success: false as const, error: quota };
    const { fixCopiedPassages } = await import("@/lib/analysis/fix-copies");
    const res = await fixCopiedPassages(articleId);
    revalidatePath("/author/articles");
    return res;
  } catch (err) {
    return actionError(err, "Düzeltme yapılamadı.");
  }
}
