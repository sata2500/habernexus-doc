"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const REQUIRED_PAGES = [
  { slug: "about", title: "Hakkımızda" },
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
export async function seedStaticPages() {
  try {
    for (const page of REQUIRED_PAGES) {
      await prisma.staticPage.upsert({
        where: { slug: page.slug },
        update: {},
        create: {
          slug: page.slug,
          title: page.title,
          content: `<h1>${page.title}</h1><p>İçerik yakında eklenecektir...</p>`,
        },
      });
    }
  } catch (error) {
    console.error("Critical: Error during seeding static pages. Table might be missing.", error);
    // Hata fırlatmıyoruz ki uygulama tamamen çökmesin
  }
}

export async function getStaticPages() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user as any).role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    // İlk çalıştırmada sayfaları oluştur (Eğer tablo yoksa burası log basıp devam edecek)
    await seedStaticPages();

    return await prisma.staticPage.findMany({
      orderBy: { createdAt: "asc" },
    });
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

export async function updateStaticPage(id: string, data: { title: string; content: string; description?: string }) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || (session.user as any).role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const page = await prisma.staticPage.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        description: data.description,
      },
    });

    revalidatePath(`/admin/pages`);
    revalidatePath(`/(main)/${page.slug}`, "page");
    
    return { success: true, page };
  } catch (error) {
    console.error("Error updating static page:", error);
    return { success: false, error: "Sayfa güncellenirken bir hata oluştu." };
  }
}
