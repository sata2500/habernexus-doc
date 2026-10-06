"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/server/authz";
import { slugify } from "@/lib/utils";
import { analyzeArticle } from "@/lib/article-analyzer";
import { rewriteArticleWithAI } from "@/lib/ai-writer";
import { checkRateLimitAsync, getActionIdentity } from "@/lib/server/rate-limit";


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
});

export type ArticleInput = z.input<typeof ArticleInputSchema>;
type SaveResult = { success: true; id: string; slug: string; status: "DRAFT" | "PUBLISHED" } | { success: false; error: string };

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
    const existing = id ? await prisma.article.findUnique({ where: { id }, select: { id: true, authorId: true, slug: true, status: true, publishedAt: true } }) : null;
    if (id && !existing) return { success: false, error: "Haber bulunamadı." };
    if (existing && session.user.role !== "ADMIN" && existing.authorId !== session.user.id) {
      return { success: false, error: "Bu haberi düzenleme yetkiniz yok." };
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
            slug: `${slugify(data.title)}-${Math.random().toString(36).slice(2, 6)}`,
            authorId: session.user.id,
            publishedAt: data.status === "PUBLISHED" ? new Date() : null,
          },
          select: { id: true, slug: true, status: true },
        });

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
    revalidatePath(`/article/${article.slug}`);
    revalidatePath("/");
    return { success: true, id: article.id, slug: article.slug, status: article.status as "DRAFT" | "PUBLISHED" };
  } catch (err) {
    console.error("Haber kaydetme hatası:", err);
    return { success: false, error: "Haber kaydedilemedi. Lütfen tekrar deneyin." };
  }
}

export async function deleteArticle(id: string) {
  try {
    const session = await requireRole("AUTHOR", "ADMIN").catch(() => null);
    if (!session) return { success: false, error: "Yetkisiz işlem." };

    const article = await prisma.article.findUnique({
      where: { id },
    });

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
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    console.error("Haber silme hatası:", err);
    return { success: false, error: "Silme işlemi sırasında hata oluştu." };
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
export async function deleteCommentByAuthor(id: string) {
  try {
    const session = await requireRole("AUTHOR", "ADMIN").catch(() => null);
    if (!session) return { success: false, error: "Yetkisiz işlem." };

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { article: true },
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
    return { success: true };
  } catch {
    return { success: false, error: "Yorum silinirken bir hata oluştu." };
  }
}

// Yazar veya Admin yetki doğrulama yardımcısı
async function assertAuthorOrAdmin(articleId: string) {
  const session = await requireRole("AUTHOR", "ADMIN");
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { authorId: true }
  });
  if (!article) {
    throw new Error("Makale bulunamadı.");
  }
  if (session.user.role !== "ADMIN" && article.authorId !== session.user.id) {
    throw new Error("Bu makale üzerinde işlem yapma yetkiniz yok.");
  }
  return session;
}

// Makaleyi analiz et (yazar)
export async function analyzeArticleAction(articleId: string) {
  try {
    const session = await assertAuthorOrAdmin(articleId);
    // Yapay zekâ maliyeti: yazar başına saatte 20 analiz
    const rate = await checkRateLimitAsync(`analyze:${session.user.id}`, 20, 60 * 60 * 1000);
    if (!rate.allowed) return { success: false as const, error: "Çok sık analiz istendi. Lütfen biraz sonra tekrar deneyin." };
    const res = await analyzeArticle(articleId);
    revalidatePath("/author/articles");
    return res;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
    return { success: false, error: errMsg };
  }
}

// Makaleyi yapay zeka ile yeniden yaz (yazar)
export async function rewriteArticleWithAIAction(articleId: string) {
  try {
    await assertAuthorOrAdmin(articleId);
    const res = await rewriteArticleWithAI(articleId);
    revalidatePath("/author/articles");
    return res;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
    return { success: false, error: errMsg };
  }
}

