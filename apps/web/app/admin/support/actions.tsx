"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";

/**
 * Destek biletlerini getirir
 */
export async function getSupportTickets() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return await prisma.supportTicket.findMany({
    include: {
      _count: {
        select: { messages: true }
      }
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Tek bir biletin detaylarını ve mesajlarını getirir
 */
export async function getTicketDetails(id: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

/**
 * Destek talebine cevap yazar ve mail gönderir
 */
export async function sendSupportReply(ticketId: string, content: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId }
  });

  if (!ticket) throw new Error("Ticket not found");

  // 1. Veritabanına kaydet
  const message = await prisma.supportMessage.create({
    data: {
      ticketId,
      sender: "support@habernexus.com", // Sabit destek adresi
      direction: "OUTBOUND",
      content,
    }
  });

  // 2. Durumu güncelle (Admin cevap verdiğinde PENDING'e çekilebilir)
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "PENDING", updatedAt: new Date() }
  });

  // 3. Kullanıcıya mail gönder
  // Not: Şimdilik basit bir React bileşeni yerine ham içerik gönderiyoruz (veya bir şablon oluşturulabilir)
  await sendEmail({
    to: ticket.userEmail,
    from: "Haber Nexus Destek <support@habernexus.com>",
    subject: `Re: ${ticket.subject}`,
    react: (
      <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
        <h2 style={{ color: '#3b82f6' }}>Merhaba,</h2>
        <p style={{ lineHeight: '1.6' }}>{content}</p>
        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
        <p style={{ fontSize: '12px', color: '#666' }}>
          Bu mail <b>Haber Nexus Destek Merkezi</b> üzerinden gönderilmiştir.
          Lütfen bu maili yanıtlayarak iletişime devam edin.
        </p>
      </div>
    )
  });

  revalidatePath(`/admin/support/${ticketId}`);
  return { success: true, message };
}

/**
 * Bilet durumunu günceller
 */
export async function updateTicketStatus(id: string, status: "OPEN" | "PENDING" | "CLOSED") {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.supportTicket.update({
    where: { id },
    data: { status, updatedAt: new Date() }
  });

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${id}`);
  return { success: true };
}
