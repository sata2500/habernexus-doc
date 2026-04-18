"use server";

import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { AdminSupportReplyTemplate } from "@/components/mail/AdminSupportReplyTemplate";
import * as React from "react";

/**
 * Vercel Blob'da saklanabilecek ek tipini tanımlar.
 */
interface StoredAttachment {
  url?: string;
}

/**
 * Admin yetkisini doğrular.
 */
async function assertAdmin() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Destek biletlerini getirir
 */
export async function getSupportTickets() {
  await assertAdmin();
  return await prisma.supportTicket.findMany({
    include: { _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Tek bir biletin detaylarını ve mesajlarını getirir
 */
export async function getTicketDetails(id: string) {
  await assertAdmin();
  return await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

/**
 * Destek talebine cevap yazar ve mail gönderir
 */
export async function sendSupportReply(ticketId: string, content: string) {
  await assertAdmin();

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket not found");

  // 1. Veritabanına kaydet
  const message = await prisma.supportMessage.create({
    data: {
      ticketId,
      sender: "support@habernexus.com",
      direction: "OUTBOUND",
      content,
    },
  });

  // 2. Durumu güncelle
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "PENDING", updatedAt: new Date() },
  });

  // 3. Kullanıcıya mail gönder
  await sendEmail({
    to: ticket.userEmail,
    from: "Haber Nexus Destek <support@habernexus.com>",
    subject: `Re: ${ticket.subject}`,
    react: React.createElement(AdminSupportReplyTemplate, { content }),
  });

  revalidatePath(`/admin/support/${ticketId}`);
  return { success: true, message };
}

/**
 * Bilet durumunu günceller
 */
export async function updateTicketStatus(id: string, status: "OPEN" | "PENDING" | "CLOSED") {
  await assertAdmin();
  await prisma.supportTicket.update({
    where: { id },
    data: { status, updatedAt: new Date() },
  });
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${id}`);
  return { success: true };
}

/**
 * Bir bileti ve tüm eklerini siler
 */
export async function deleteSupportTicket(id: string) {
  await assertAdmin();

  // 1. Bilete ait tüm mesajları bul
  const messages = await prisma.supportMessage.findMany({
    where: { ticketId: id },
    select: { attachments: true },
  });

  // 2. Varsa Blob URL'lerini sil
  const urlsToDelete: string[] = [];
  messages.forEach((msg) => {
    if (msg.attachments && Array.isArray(msg.attachments)) {
      (msg.attachments as StoredAttachment[]).forEach((att) => {
        if (att.url) urlsToDelete.push(att.url);
      });
    }
  });

  if (urlsToDelete.length > 0) {
    try {
      await del(urlsToDelete, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (err) {
      console.error("Blob silme hatası:", err);
      // Kritik değil, DB silme işlemine devam et
    }
  }

  // 3. Veritabanından sil (cascade ile mesajlar da silinir)
  await prisma.supportTicket.delete({ where: { id } });
  revalidatePath("/admin/support");
  return { success: true };
}
