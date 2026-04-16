"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const REQUIRED_PAGES = [
  { slug: "about", title: "Hakkımızda" },
  { slug: "contact", title: "İletişim", defaults: { email: "info@habernexus.com", phone: "+90 (212) 000 00 00", address: "Levent Mah. Medya Sk. No: 1, Beşiktaş / İstanbul" } },
  { slug: "careers", title: "Kariyer" },
  { slug: "advertise", title: "Reklam", defaults: { email: "ads@habernexus.com" } },
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
          extraData: page.defaults || {},
        },
      });
    }
  } catch (error) {
    console.error("Critical: Error during seeding static pages. Table might be missing.", error);
  }
}

export async function getStaticPages() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateStaticPage(id: string, data: { title: string; content: string; description?: string; extraData?: any }) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });

    if (!session || session.user.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const page = await prisma.staticPage.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        description: data.description,
        extraData: data.extraData,
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
