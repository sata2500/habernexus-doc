"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse } from "@/lib/types";

// Basit Türkçe karakter destekli SLUG üretici
function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function createArticle(data: {
  title: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  categoryId: string;
  status: "DRAFT" | "PUBLISHED";
}): Promise<ActionResponse> {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Yetkisiz işlem." };
    }

    const baseSlug = generateSlug(data.title);
    const uniqueHash = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${uniqueHash}`;

    await prisma.article.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt || "",
        content: data.content,
        coverImage: data.coverImage || null,
        categoryId: data.categoryId,
        authorId: session.user.id,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
    });

    revalidatePath("/author/articles");
    revalidatePath("/");
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Veritabanına kaydedilirken hata oluştu.";
    console.error("Haber oluşturma hatası:", error);
    return { success: false, error: message };
  }
}

export async function getAuthorArticles() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN")) {
      return [];
    }

    return await prisma.article.findMany({
      where: { authorId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
  } catch (error) {
    return [];
  }
}

export async function getArticleToEdit(id: string) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Yetkisiz işlem." };
    }

    const article = await prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!article) {
      return { success: false, error: "Makale bulunamadı." };
    }

    // Bir yazar sadece kendi makalesini düzenleyebilir (Admin her şeyi düzenleyebilir)
    if (session.user.role !== "ADMIN" && article.authorId !== session.user.id) {
      return { success: false, error: "Bu makaleyi düzenleme yetkiniz yok." };
    }

    return { success: true, article };
  } catch (error) {
    return { success: false, error: "Makale yüklenirken hata oluştu." };
  }
}

export async function updateArticle(id: string, data: {
  title: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  categoryId: string;
  status: "DRAFT" | "PUBLISHED";
}): Promise<ActionResponse> {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Yetkisiz işlem." };
    }

    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return { success: false, error: "Makale bulunamadı." };
    }

    if (session.user.role !== "ADMIN" && article.authorId !== session.user.id) {
      return { success: false, error: "Bu makaleyi düzenleme yetkiniz yok." };
    }

    await prisma.article.update({
      where: { id },
      data: {
        title: data.title,
        excerpt: data.excerpt || "",
        content: data.content,
        coverImage: data.coverImage || null,
        categoryId: data.categoryId,
        status: data.status,
        updatedAt: new Date(),
        // Eğer taslağı yayınlıyorsa publishedAt güncelle
        ...(data.status === "PUBLISHED" && !article.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });

    revalidatePath("/author/articles");
    revalidatePath(`/article/${article.slug}`);
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Haber güncelleme hatası:", error);
    return { success: false, error: "Güncelleme sırasında hata oluştu." };
  }
}

export async function getCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    });
  } catch (error) {
    return [];
  }
}

export async function deleteArticle(id: string) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Yetkisiz işlem." };
    }

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

    revalidatePath("/author/articles");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Haber silme hatası:", error);
    return { success: false, error: "Silme işlemi sırasında hata oluştu." };
  }
}

export async function incrementViewCount(id: string) {
  try {
    await prisma.article.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// Yazarın kendi makalelerine gelen yorumları getir
export async function getAuthorComments() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN")) {
      return [];
    }

    return await prisma.comment.findMany({
      where: {
        article: {
          authorId: session.user.id,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, image: true } },
        article: { select: { title: true, slug: true } },
      },
    });
  } catch (error) {
    return [];
  }
}

// Yazarın makalesine ait bir yorumu yazarın kendisinin silmesi
export async function deleteCommentByAuthor(id: string) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user.role !== "AUTHOR" && session.user.role !== "ADMIN")) {
      return { success: false, error: "Yetkisiz işlem." };
    }

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

    revalidatePath("/author/comments");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Yorum silinirken bir hata oluştu." };
  }
}

