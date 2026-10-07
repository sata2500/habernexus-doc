"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { actionError, requireRole, ROLES, type Role } from "@/lib/server/authz";
import type { ActionResult } from "@/lib/types";
import { deleteAccountSafely } from "@/lib/server/account-deletion";
import { analyzeArticle } from "@/lib/article-analyzer";
import { rewriteArticleWithAI } from "@/lib/ai-writer";
import { invalidateArticle, invalidateArticles } from "@/lib/server/article-cache";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { categoryIcon } from "@/components/ui/category-icons";

/*
 * Yönetim paneli işlemleri. Her işlem önce yönetici yetkisini doğrular; hatalar kullanıcıya
 * gösterilebilir Türkçe metne çevrilir (iç ayrıntı sızmaz).
 */

const assertAdmin = () => requireRole("ADMIN");

const Id = z.string().trim().min(1).max(100);
const Ids = z.array(Id).min(1, "Haber seçilmedi.").max(200, "Tek seferde en fazla 200 haber işlenebilir.");
const ArticleStatus = z.enum(["DRAFT", "PUBLISHED"]);

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Geçersiz bilgi.";

/** Yayın durumu değişen haberleri Google'a bildirir (yanıt beklenmez) */
async function notifyIndexing(changes: { slug: string; action: "URL_UPDATED" | "URL_DELETED" }[]) {
  if (changes.length === 0) return;
  const { notifyGoogle, getArticleUrl } = await import("@/lib/google-indexing");
  after(async () => {
    for (const c of changes) {
      await notifyGoogle(getArticleUrl(c.slug), c.action).catch((err) => console.error("Google Indexing Error:", err));
    }
  });
}

/* ── Kullanıcılar ─────────────────────────────────────── */

export async function updateUserRole(userId: string, role: string): Promise<ActionResult> {
  try {
    const session = await assertAdmin();
    if (!Id.safeParse(userId).success || !ROLES.includes(role as Role)) return { success: false, error: "Geçersiz rol." };
    // Yönetici kendi yetkisini düşürüp panele erişimini kaybedemez
    if (session.user.id === userId && role !== "ADMIN") return { success: false, error: "Kendi yönetici yetkinizi kaldıramazsınız." };

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) return { success: false, error: "Kullanıcı bulunamadı." };
    if (target.role === role) return { success: true };

    await prisma.user.update({ where: { id: userId }, data: { role } });
    // Yetkisi düşürülen kullanıcının açık oturumları kapatılır (eski yetkiyle işlem yapamasın)
    if (target.role === "ADMIN" || (target.role === "AUTHOR" && role === "USER")) {
      await prisma.session.deleteMany({ where: { userId } });
    }
    console.warn(`[Admin] ${session.user.id} kullanıcısı ${userId} rolünü ${target.role} → ${role} yaptı.`);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return actionError(err, "Rol güncellenemedi.");
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const session = await assertAdmin();
    if (!Id.safeParse(userId).success) return { success: false, error: "Geçersiz kullanıcı." };
    if (session.user.id === userId) {
      return { success: false, error: "Kendi hesabınızı bu panelden silemezsiniz. Tercihler sayfasını kullanın." };
    }
    // Son yönetici korunur; kullanıcının haberleri silinmez, yöneticiye devredilir
    const result = await deleteAccountSafely(userId);
    if (!result.success) return result;
    console.warn(`[Admin] ${session.user.id} kullanıcısı ${userId} hesabını sildi (${result.reassigned} haber devredildi).`);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return actionError(err, "Kullanıcı silinemedi.");
  }
}

/** E-posta adresini doğrulanmış sayar (doğrulama e-postası ulaşmayan, yöneticinin tanıdığı hesaplar için) */
export async function markEmailVerified(userId: string): Promise<ActionResult> {
  try {
    const session = await assertAdmin();
    if (!Id.safeParse(userId).success) return { success: false, error: "Geçersiz kullanıcı." };
    const res = await prisma.user.updateMany({ where: { id: userId }, data: { emailVerified: true } });
    if (res.count === 0) return { success: false, error: "Kullanıcı bulunamadı." };
    console.warn(`[Admin] ${session.user.id} kullanıcısı ${userId} e-postasını doğrulanmış saydı.`);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return actionError(err, "İşlem yapılamadı.");
  }
}

/* ── Haberler ─────────────────────────────────────────── */

export async function updateArticleStatus(articleId: string, status: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    return await setArticleStatuses([articleId], status);
  } catch (err) {
    return actionError(err, "Haber durumu güncellenemedi.");
  }
}

export async function deleteArticle(articleId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    return await removeArticles([articleId]);
  } catch (err) {
    return actionError(err, "Haber silinemedi.");
  }
}

export async function bulkUpdateArticleStatus(articleIds: string[], status: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    return await setArticleStatuses(articleIds, status);
  } catch (err) {
    return actionError(err, "Haber durumu güncellenemedi.");
  }
}

export async function bulkDeleteArticles(articleIds: string[]): Promise<ActionResult> {
  try {
    await assertAdmin();
    return await removeArticles(articleIds);
  } catch (err) {
    return actionError(err, "Haber silinemedi.");
  }
}

/** (Yetki çağıran işlemde denetlenir) */
async function setArticleStatuses(articleIds: string[], status: string): Promise<ActionResult> {
  const ids = Ids.safeParse(articleIds);
  const target = ArticleStatus.safeParse(status);
  if (!ids.success) return { success: false, error: firstIssue(ids.error) };
  if (!target.success) return { success: false, error: "Geçersiz haber durumu." };

  const before = await prisma.article.findMany({ where: { id: { in: ids.data } }, select: { slug: true, status: true } });
  if (before.length === 0) return { success: false, error: "Haber bulunamadı." };

  if (target.data === "PUBLISHED") {
    // Yayın tarihi korunur: yayından kaldırılıp yeniden yayımlanan haber "yeni haber" gibi görünmez
    await prisma.$transaction([
      prisma.article.updateMany({ where: { id: { in: ids.data }, publishedAt: { not: null } }, data: { status: "PUBLISHED" } }),
      prisma.article.updateMany({ where: { id: { in: ids.data }, publishedAt: null }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    ]);
  } else {
    await prisma.article.updateMany({ where: { id: { in: ids.data } }, data: { status: "DRAFT" } });
  }

  // Yalnızca durumu gerçekten değişenler bildirilir (Google kotası)
  await notifyIndexing(
    before
      .filter((a) => a.status !== target.data)
      .map((a) => ({ slug: a.slug, action: target.data === "PUBLISHED" ? "URL_UPDATED" as const : "URL_DELETED" as const })),
  );
  revalidatePath("/admin/articles");
  await invalidateArticles(before.map((a) => a.slug));
  return { success: true };
}

async function removeArticles(articleIds: string[]): Promise<ActionResult> {
  const ids = Ids.safeParse(articleIds);
  if (!ids.success) return { success: false, error: firstIssue(ids.error) };

  const before = await prisma.article.findMany({ where: { id: { in: ids.data } }, select: { slug: true, status: true } });
  if (before.length === 0) return { success: false, error: "Haber bulunamadı." };
  await prisma.article.deleteMany({ where: { id: { in: ids.data } } });

  await notifyIndexing(before.filter((a) => a.status === "PUBLISHED").map((a) => ({ slug: a.slug, action: "URL_DELETED" as const })));
  revalidatePath("/admin/articles");
  await invalidateArticles(before.map((a) => a.slug));
  return { success: true };
}

/* ── Kategoriler ──────────────────────────────────────── */

export async function getAllCategoriesAdmin() {
  await assertAdmin();
  return prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { articles: true } } },
  });
}

const CategoryInput = z.object({
  name: z.string().trim().min(2, "Kategori adı en az 2 karakter olmalı.").max(40, "Kategori adı en fazla 40 karakter olabilir."),
  slug: z.string().trim().toLowerCase().min(2, "Adres en az 2 karakter olmalı.").max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Adres yalnızca küçük harf (Türkçe karaktersiz), rakam ve tire içerebilir."),
  color: z.string().trim().regex(/^(#[0-9a-fA-F]{3,8})?$/, "Renk #RRGGBB biçiminde olmalı.").optional().default(""),
  icon: z.string().trim().max(40).optional().default("")
    .refine((v) => !v || !!categoryIcon(v), "Seçilen simge listede yok."),
  order: z.coerce.number().int().min(0).max(999).optional().default(0),
});
type CategoryData = z.input<typeof CategoryInput>;

async function afterCategoryChange() {
  revalidatePath("/admin/categories");
  await invalidateArticle(null);
  // Menüdeki kategori listesi tüm sayfalarda görünür
  revalidatePath("/", "layout");
}

export async function createCategory(data: CategoryData): Promise<ActionResult> {
  try {
    await assertAdmin();
    const parsed = CategoryInput.safeParse(data);
    if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
    const d = parsed.data;
    const clash = await prisma.category.findFirst({ where: { OR: [{ slug: d.slug }, { name: { equals: d.name, mode: "insensitive" } }] }, select: { slug: true } });
    if (clash) return { success: false, error: clash.slug === d.slug ? "Bu adrese sahip bir kategori zaten var." : "Bu adda bir kategori zaten var." };

    await prisma.category.create({ data: { name: d.name, slug: d.slug, color: d.color || null, icon: d.icon || null, order: d.order } });
    await afterCategoryChange();
    return { success: true };
  } catch (err) {
    return actionError(err, "Kategori eklenemedi.");
  }
}

export async function updateCategory(id: string, data: CategoryData): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!Id.safeParse(id).success) return { success: false, error: "Geçersiz kategori." };
    const parsed = CategoryInput.safeParse(data);
    if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
    const d = parsed.data;
    const clash = await prisma.category.findFirst({
      where: { id: { not: id }, OR: [{ slug: d.slug }, { name: { equals: d.name, mode: "insensitive" } }] },
      select: { slug: true },
    });
    if (clash) return { success: false, error: clash.slug === d.slug ? "Bu adrese sahip başka bir kategori var." : "Bu adda başka bir kategori var." };

    const res = await prisma.category.updateMany({ where: { id }, data: { name: d.name, slug: d.slug, color: d.color || null, icon: d.icon || null, order: d.order } });
    if (res.count === 0) return { success: false, error: "Kategori bulunamadı." };
    await afterCategoryChange();
    return { success: true };
  } catch (err) {
    return actionError(err, "Kategori güncellenemedi.");
  }
}

export async function deleteCategoryAdmin(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!Id.safeParse(id).success) return { success: false, error: "Geçersiz kategori." };
    const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { articles: true } } } });
    if (!category) return { success: false, error: "Kategori bulunamadı." };
    if (category._count.articles > 0) {
      return { success: false, error: `Bu kategoride ${category._count.articles} haber var. Silmeden önce haberleri başka bir kategoriye taşıyın.` };
    }
    await prisma.category.delete({ where: { id } });
    await afterCategoryChange();
    return { success: true };
  } catch (err) {
    return actionError(err, "Kategori silinemedi.");
  }
}

/* ── Yorumlar ─────────────────────────────────────────── */

export async function deleteCommentAdmin(id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (!Id.safeParse(id).success) return { success: false, error: "Geçersiz yorum." };
    const comment = await prisma.comment.findUnique({ where: { id }, select: { article: { select: { slug: true } } } });
    if (!comment) return { success: false, error: "Yorum bulunamadı." };
    await prisma.comment.delete({ where: { id } });
    revalidatePath("/admin/comments");
    revalidatePath(`/article/${comment.article.slug}`);
    return { success: true };
  } catch (err) {
    return actionError(err, "Yorum silinemedi.");
  }
}

/* ── Yapay zekâ araçları (analiz penceresi) ───────────── */

async function adminAiQuota(kind: string, userId: string, perHour: number) {
  const rate = await checkRateLimitAsync(`admin-${kind}:${userId}`, perHour, 60 * 60 * 1000);
  return rate.allowed ? null : "Çok sık istendi. Lütfen biraz sonra tekrar deneyin.";
}

export async function analyzeArticleAction(articleId: string) {
  try {
    const session = await assertAdmin();
    if (!Id.safeParse(articleId).success) return { success: false as const, error: "Geçersiz haber." };
    const quota = await adminAiQuota("analyze", session.user.id, 60);
    if (quota) return { success: false as const, error: quota };
    const res = await analyzeArticle(articleId);
    revalidatePath("/admin/articles");
    return res;
  } catch (err) {
    return actionError(err, "Analiz yapılamadı.");
  }
}

export async function rewriteArticleWithAIAction(articleId: string) {
  try {
    const session = await assertAdmin();
    if (!Id.safeParse(articleId).success) return { success: false as const, error: "Geçersiz haber." };
    const quota = await adminAiQuota("rewrite", session.user.id, 30);
    if (quota) return { success: false as const, error: quota };
    const res = await rewriteArticleWithAI(articleId);
    revalidatePath("/admin/articles");
    return res;
  } catch (err) {
    return actionError(err, "Yeniden yazım yapılamadı.");
  }
}

export async function fixCopiedPassagesAction(articleId: string) {
  try {
    const session = await assertAdmin();
    if (!Id.safeParse(articleId).success) return { success: false as const, error: "Geçersiz haber." };
    const quota = await adminAiQuota("fixcopies", session.user.id, 30);
    if (quota) return { success: false as const, error: quota };
    const { fixCopiedPassages } = await import("@/lib/analysis/fix-copies");
    const res = await fixCopiedPassages(articleId);
    revalidatePath("/admin/articles");
    return res;
  } catch (err) {
    return actionError(err, "Düzeltme yapılamadı.");
  }
}
