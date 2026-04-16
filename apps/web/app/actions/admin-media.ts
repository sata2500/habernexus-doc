"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

export async function getAdminMedia() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "AUTHOR") {
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

  if (!session || (session.user as any).role !== "ADMIN") {
    throw new Error("Sadece adminler medya silebilir.");
  }

  const media = await prisma.media.findUnique({ where: { id } });

  if (media) {
    try {
      await del(media.url);
    } catch (e) {
      console.warn("Blob silinemedi:", e);
    }
    await prisma.media.delete({ where: { id } });
  }

  revalidatePath("/admin/media");
  return { success: true };
}
