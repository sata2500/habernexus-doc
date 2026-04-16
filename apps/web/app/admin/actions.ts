"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function assertAdmin() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Yetkisiz işlem. Sadece adminler bu aksiyonu gerçekleştirebilir.");
  }
  return session;
}

// Admin platform istatistikleri
export async function getAdminStats() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session || session.user.role !== "ADMIN") return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers,
    totalArticles,
    publishedArticles,
    draftArticles,
    totalViews,
    categories,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.article.count(),
    prisma.article.count({ where: { status: "PUBLISHED" } }),
    prisma.article.count({ where: { status: "DRAFT" } }),
    prisma.article.aggregate({ _sum: { viewCount: true } }),
    prisma.category.findMany({
      include: { _count: { select: { articles: { where: { status: "PUBLISHED" } } } } },
      orderBy: { order: "asc" },
    }),
  ]);

  return {
    totalUsers,
    newUsers,
    totalArticles,
    publishedArticles,
    draftArticles,
    totalViews: totalViews._sum.viewCount ?? 0,
    categories,
  };
}

// Tüm kullanıcıları getir
export async function getAllUsers() {
  await assertAdmin();
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { articles: true, comments: true } },
    },
  });
}

// Kullanıcı rolü güncelle
export async function updateUserRole(userId: string, role: string) {
  await assertAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  revalidatePath("/admin/users");
  return { success: true };
}

// Kullanıcıyı tamamen sil (Cascade delete devreye girer)
export async function deleteUser(userId: string) {
  await assertAdmin();
  
  // Kendini silmeye çalışmasın?
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (session?.user.id === userId) {
    return { success: false, error: "Kendi hesabınızı bu panelden silemezsiniz. Lütfen tercihler sayfasını kullanın." };
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// Tüm makaleleri getir (admin görünümü)
export async function getAllArticles() {
  await assertAdmin();
  return prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, email: true, image: true } },
      category: { select: { name: true, color: true, id: true } },
    },
  });
}

// Makale durumunu güncelle
export async function updateArticleStatus(articleId: string, status: string) {
  await assertAdmin();
  await prisma.article.update({
    where: { id: articleId },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/");
  return { success: true };
}

// Makaleyi sil
export async function deleteArticle(articleId: string) {
  await assertAdmin();
  await prisma.article.delete({ where: { id: articleId } });
  revalidatePath("/admin/articles");
  revalidatePath("/");
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
  revalidatePath("/");
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
  revalidatePath("/");
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
  revalidatePath("/");
  return { success: true };
}

// Global yorum yönetimi için tüm yorumları getir
export async function getAllCommentsAdmin() {
  await assertAdmin();
  return prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, image: true, email: true } },
      article: { select: { title: true, slug: true } },
    },
  });
}

// Admin tarafından yorum silme
export async function deleteCommentAdmin(id: string) {
  await assertAdmin();
  await prisma.comment.delete({
    where: { id },
  });
  revalidatePath("/admin/comments");
  return { success: true };
}
