"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, adminOnly } from "@/lib/server/authz";

const REQUIRED_PAGES = [
  { slug: "about", title: "Hakkımızda" },
  // İletişim bilgileri admin panelinden girilir; uydurma varsayılan telefon/adres konmaz
  { slug: "contact", title: "İletişim" },
  { slug: "careers", title: "Kariyer" },
  { slug: "advertise", title: "Reklam" },
  { slug: "privacy", title: "Gizlilik Politikası" },
  { slug: "terms", title: "Kullanım Şartları" },
  { slug: "cookies", title: "Çerez Politikası" },
  { slug: "kvkk", title: "KVKK Aydınlatma Metni" },
];

/**
 * Gerekli sayfaların veritabanında mevcut olduğundan emin olur.
 */
async function seedStaticPages() {
  try {
    for (const page of REQUIRED_PAGES) {
      await prisma.staticPage.upsert({
        where: { slug: page.slug },
        update: {},
        create: {
          slug: page.slug,
          title: page.title,
          // Sayfa başlığı şablonda h1 olarak basılır; içerikte ikinci h1 olmasın
          content: "<p>İçerik yakında eklenecektir.</p>",
          extraData: {},
        },
      });
    }
  } catch (error) {
    console.error("Critical: Error during seeding static pages. Table might be missing.", error);
  }
}

/** Henüz yazılmamış (varsayılan metinli veya çok kısa) sayfaları ayırt eder. */
function isPlaceholder(content: string) {
  const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.includes("İçerik yakında eklenecektir") || text.length < 80;
}

export async function getStaticPages() {
  await requireRole("ADMIN");
  try {
    await seedStaticPages();
    const pages = await prisma.staticPage.findMany({ orderBy: { createdAt: "asc" } });
    return pages.map((p) => ({ ...p, isPlaceholder: isPlaceholder(p.content) }));
  } catch (error) {
    console.error("Error fetching static pages:", error);
    return [];
  }
}

export async function getStaticPageBySlug(slug: string) {
  try {
    return await prisma.staticPage.findUnique({
      where: { slug },
    });
  } catch (error) {
    console.error(`Error fetching static page by slug (${slug}):`, error);
    return null;
  }
}

const ExtraDataSchema = z.object({
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(60).optional(),
  address: z.string().trim().max(300).optional(),
}).strict();

const StaticPageSchema = z.object({
  title: z.string().trim().min(2, "Başlık gerekli.").max(120),
  description: z.string().trim().max(300).optional(),
  content: z.string().max(200_000),
  extraData: ExtraDataSchema.optional(),
});

export async function updateStaticPage(id: string, input: z.input<typeof StaticPageSchema>) {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = StaticPageSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Geçersiz bilgi." };
  try {
    const page = await prisma.staticPage.update({
      where: { id },
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        description: parsed.data.description || null,
        ...(parsed.data.extraData && { extraData: parsed.data.extraData }),
      },
    });
    revalidatePath("/admin/pages");
    revalidatePath(`/${page.slug}`);
    return { success: true as const };
  } catch (error) {
    console.error("Error updating static page:", error);
    return { success: false as const, error: "Sayfa güncellenirken bir hata oluştu." };
  }
}
