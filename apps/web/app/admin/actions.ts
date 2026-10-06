"use server";

import { requireRole } from "@/lib/server/authz";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteAccountSafely } from "@/lib/server/account-deletion";
import { analyzeArticle } from "@/lib/article-analyzer";
import { rewriteArticleWithAI } from "@/lib/ai-writer";
import { ROLES, type Role } from "@/lib/server/authz";
import { invalidateArticle, invalidateArticles } from "@/lib/server/article-cache";

const ARTICLE_STATUSES = ["DRAFT", "PUBLISHED"] as const;

function isArticleStatus(value: string): value is (typeof ARTICLE_STATUSES)[number] {
  return (ARTICLE_STATUSES as readonly string[]).includes(value);
}

// Ortak yetki kontrolü (lib/server/authz)
const assertAdmin = () => requireRole("ADMIN");

// Kullanıcı rolü güncelle
export async function updateUserRole(userId: string, role: string) {
  const session = await assertAdmin();

  if (!ROLES.includes(role as Role)) {
    return { success: false, error: "Geçersiz rol." };
  }

  // Adminin kendi yetkisini düşürüp panele erişimini kaybetmesini engelle
  if (session.user.id === userId && role !== "ADMIN") {
    return { success: false, error: "Kendi admin yetkinizi kaldıramazsınız." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { success: false, error: "Kullanıcı bulunamadı." };

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  console.warn(`[Admin] ${session.user.id} kullanıcısı ${userId} rolünü ${target.role} → ${role} yaptı.`);
  revalidatePath("/admin/users");
  return { success: true };
}

// Kullanıcıyı tamamen sil (Cascade delete devreye girer)
export async function deleteUser(userId: string) {
  const session = await assertAdmin();
  if (typeof userId !== "string" || !userId) return { success: false, error: "Geçersiz kullanıcı." };

  if (session.user.id === userId) {
    return { success: false, error: "Kendi hesabınızı bu panelden silemezsiniz. Lütfen tercihler sayfasını kullanın." };
  }

  // Son yönetici korunur; kullanıcının haberleri silinmez, yöneticiye devredilir
  const result = await deleteAccountSafely(userId);
  if (!result.success) return result;
  console.warn(`[Admin] ${session.user.id} kullanıcısı ${userId} hesabını sildi (${result.reassigned} haber devredildi).`);

  revalidatePath("/admin/users");
  return { success: true };
}

// Makale durumunu güncelle
export async function updateArticleStatus(articleId: string, status: string) {
  await assertAdmin();
  if (!isArticleStatus(status)) {
    return { success: false, error: "Geçersiz makale durumu." };
  }

  const articleBefore = await prisma.article.findUnique({ where: { id: articleId } });

  const updatedArticle = await prisma.article.update({
    where: { id: articleId },
    data: {
      status,
      // Yayın tarihi korunur: yayından kaldırılıp yeniden yayımlanan haber "yeni haber" gibi görünmez
      ...(status === "PUBLISHED" && !articleBefore?.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });

  if (updatedArticle.status === "PUBLISHED") {
    const { notifyGoogle, getArticleUrl } = await import("@/lib/google-indexing");
    after(() => notifyGoogle(getArticleUrl(updatedArticle.slug), "URL_UPDATED").catch(err => console.error("Google Indexing Error:", err)));
  } else if (articleBefore?.status === "PUBLISHED" && updatedArticle.status !== "PUBLISHED") {
    const { notifyGoogle, getArticleUrl } = await import("@/lib/google-indexing");
    after(() => notifyGoogle(getArticleUrl(articleBefore.slug), "URL_DELETED").catch(err => console.error("Google Indexing Error:", err)));
  }

  await invalidateArticle(updatedArticle.slug);
  revalidatePath("/admin/articles");
  return { success: true };
}

// Makaleyi sil
export async function deleteArticle(articleId: string) {
  await assertAdmin();
  const article = await prisma.article.findUnique({ where: { id: articleId } });

  await prisma.article.delete({ where: { id: articleId } });

  if (article && article.status === "PUBLISHED") {
    const { notifyGoogle, getArticleUrl } = await import("@/lib/google-indexing");
    after(() => notifyGoogle(getArticleUrl(article.slug), "URL_DELETED").catch(err => console.error("Google Indexing Error:", err)));
  }

  await invalidateArticle(article?.slug);
  revalidatePath("/admin/articles");
  return { success: true };
}

// Toplu makale durum güncelleme
export async function bulkUpdateArticleStatus(articleIds: string[], status: string) {
  await assertAdmin();
  if (!isArticleStatus(status)) {
    return { success: false, error: "Geçersiz makale durumu." };
  }

  const articlesBefore = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    select: { id: true, slug: true, status: true }
  });

  if (status === "PUBLISHED") {
    // Daha önce yayın tarihi olanların tarihini koru, olmayanlara şimdiki zamanı ata
    await prisma.$transaction([
      prisma.article.updateMany({
        where: { id: { in: articleIds }, publishedAt: { not: null } },
        data: { status },
      }),
      prisma.article.updateMany({
        where: { id: { in: articleIds }, publishedAt: null },
        data: { status, publishedAt: new Date() },
      }),
    ]);
  } else {
    await prisma.article.updateMany({
      where: { id: { in: articleIds } },
      data: { status },
    });
  }

  const { notifyGoogle, getArticleUrl } = await import("@/lib/google-indexing");
  for (const article of articlesBefore) {
    if (status === "PUBLISHED") {
      after(() => notifyGoogle(getArticleUrl(article.slug), "URL_UPDATED").catch(err => console.error("Google Indexing Error:", err)));
    } else if (article.status === "PUBLISHED") {
      after(() => notifyGoogle(getArticleUrl(article.slug), "URL_DELETED").catch(err => console.error("Google Indexing Error:", err)));
    }
  }

  revalidatePath("/admin/articles");
  await invalidateArticles(articlesBefore.map((a) => a.slug));
  return { success: true };
}

// Toplu makale silme
export async function bulkDeleteArticles(articleIds: string[]) {
  await assertAdmin();

  const articlesBefore = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    select: { slug: true, status: true }
  });

  await prisma.article.deleteMany({
    where: { id: { in: articleIds } },
  });

  const { notifyGoogle, getArticleUrl } = await import("@/lib/google-indexing");
  for (const article of articlesBefore) {
    if (article.status === "PUBLISHED") {
      after(() => notifyGoogle(getArticleUrl(article.slug), "URL_DELETED").catch(err => console.error("Google Indexing Error:", err)));
    }
  }

  revalidatePath("/admin/articles");
  await invalidateArticles(articlesBefore.map((a) => a.slug));
  return { success: true };
}

// Tüm kategorileri admin görünümü için getir
export async function getAllCategoriesAdmin() {
  await assertAdmin();
  return prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { articles: true } } },
  });
}

// Yeni kategori ekle
export async function createCategory(data: { name: string; slug: string; color: string; icon: string; order: number }) {
  await assertAdmin();
  const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return { success: false, error: "Bu URL adresine (slug) sahip bir kategori zaten var." };
  }

  await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      color: data.color || null,
      icon: data.icon || null,
      order: data.order,
    },
  });
  revalidatePath("/admin/categories");
  await invalidateArticle(null);
  return { success: true };
}

// Kategoriyi güncelle
export async function updateCategory(id: string, data: { name: string; slug: string; color: string; icon: string; order: number }) {
  await assertAdmin();
  const existing = await prisma.category.findFirst({
    where: { slug: data.slug, id: { not: id } }
  });
  if (existing) {
    return { success: false, error: "Bu URL adresine (slug) sahip başka bir kategori var." };
  }

  await prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      color: data.color || null,
      icon: data.icon || null,
      order: data.order,
    },
  });
  revalidatePath("/admin/categories");
  await invalidateArticle(null);
  return { success: true };
}

// Kategoriyi sil
export async function deleteCategoryAdmin(id: string) {
  await assertAdmin();
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { articles: true } } }
  });

  if (!category) return { success: false, error: "Kategori bulunamadı." };
  if (category._count.articles > 0) {
    return { success: false, error: "Bu kategoriye ait makaleler var. Silmeden önce makaleleri şuradan veya başka bir kategoriye taşıyın." };
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  await invalidateArticle(null);
  return { success: true };
}

export async function deleteCommentAdmin(id: string) {
  await assertAdmin();
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { article: { select: { slug: true } } },
  });
  await prisma.comment.delete({ where: { id } });
  revalidatePath("/admin/comments");
  if (comment?.article?.slug) {
    revalidatePath(`/article/${comment.article.slug}`);
  }
  return { success: true };
}

// Makaleyi analiz et (admin)
export async function analyzeArticleAction(articleId: string) {
  await assertAdmin();
  const res = await analyzeArticle(articleId);
  revalidatePath("/admin/articles");
  return res;
}

// Makaleyi yapay zeka ile yeniden yaz (admin)
export async function rewriteArticleWithAIAction(articleId: string) {
  await assertAdmin();
  const res = await rewriteArticleWithAI(articleId);
  revalidatePath("/admin/articles");
  return res;
}

// Kaynaklardan aynen alınmış bölümleri özgünleştir (admin)
export async function fixCopiedPassagesAction(articleId: string) {
  await assertAdmin();
  try {
    const { fixCopiedPassages } = await import("@/lib/analysis/fix-copies");
    const res = await fixCopiedPassages(articleId);
    revalidatePath("/admin/articles");
    return res;
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Düzeltme yapılamadı." };
  }
}
