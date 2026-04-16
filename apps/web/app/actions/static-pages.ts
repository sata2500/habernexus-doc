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
}

export async function getStaticPages() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // İlk çalıştırmada sayfaları oluştur
  await seedStaticPages();

  return await prisma.staticPage.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function getStaticPageBySlug(slug: string) {
  return await prisma.staticPage.findUnique({
    where: { slug },
  });
}

export async function updateStaticPage(id: string, data: { title: string; content: string; description?: string }) {
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
}
