"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

export async function getAdminMedia() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "AUTHOR")) {
    throw new Error("Unauthorized");
  }

  return await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function deleteMedia(id: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Sadece adminler medya silebilir.");
  }

  const media = await prisma.media.findUnique({ where: { id } });

  if (media) {
    const deletedUrl = media.url;
    try {
      await del(deletedUrl);
    } catch (e) {
      console.warn("Blob silinemedi:", e);
    }

    // İlişkili tabloları temizle
    await prisma.article.updateMany({
      where: { coverImage: deletedUrl },
      data: { coverImage: null }
    });

    await prisma.user.updateMany({
      where: { image: deletedUrl },
      data: { image: null }
    });

    await prisma.media.delete({ where: { id } });
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin/articles");
  revalidatePath("/");
  return { success: true };
}
