"use server";

import { actionError, adminOnly, requireRole } from "@/lib/server/authz";

import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
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
// Ortak yetki kontrolü (lib/server/authz)
const assertAdmin = () => requireRole("ADMIN");

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

const TICKET_STATUSES = ["OPEN", "PENDING", "CLOSED"] as const;
const validId = (id: unknown): id is string => typeof id === "string" && !!id && id.length <= 100;

/**
 * Destek talebine yanıt verir: önce e-posta gönderilir, yalnızca gönderim başarılıysa yanıt
 * kaydedilir ve talep "yanıt bekleniyor" durumuna geçer (ulaşmayan yanıt "gönderildi" görünmesin).
 */
export async function sendSupportReply(ticketId: string, content: string) {
  const denied = await adminOnly();
  if (denied) return denied;
  try {
    const text = typeof content === "string" ? content.trim() : "";
    if (!validId(ticketId)) return { success: false as const, error: "Geçersiz talep." };
    if (!text) return { success: false as const, error: "Yanıt boş olamaz." };
    if (text.length > 10_000) return { success: false as const, error: "Yanıt en fazla 10.000 karakter olabilir." };

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { userEmail: true, subject: true } });
    if (!ticket) return { success: false as const, error: "Talep bulunamadı." };

    const subject = `Re: ${ticket.subject}`.replace(/[\r\n]+/g, " ").slice(0, 200);
    const sent = await sendEmail({
      to: ticket.userEmail,
      from: "Haber Nexus Destek <support@habernexus.com>",
      subject,
      react: React.createElement(AdminSupportReplyTemplate, { content: text }),
    });
    if (!sent.success) {
      return { success: false as const, error: "E-posta gönderilemedi; yanıt kaydedilmedi. E-posta ayarlarını kontrol edip tekrar deneyin." };
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: { ticketId, sender: "support@habernexus.com", direction: "OUTBOUND", content: text },
      });
      await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "PENDING", updatedAt: new Date() } });
      return created;
    });

    revalidatePath(`/admin/support/${ticketId}`);
    revalidatePath("/admin/support");
    return { success: true as const, message };
  } catch (err) {
    return actionError(err, "Yanıt gönderilemedi.");
  }
}

/** Talep durumunu günceller */
export async function updateTicketStatus(id: string, status: "OPEN" | "PENDING" | "CLOSED") {
  const denied = await adminOnly();
  if (denied) return denied;
  if (!validId(id) || !TICKET_STATUSES.includes(status)) return { success: false as const, error: "Geçersiz durum." };
  try {
    const res = await prisma.supportTicket.updateMany({ where: { id }, data: { status, updatedAt: new Date() } });
    if (res.count === 0) return { success: false as const, error: "Talep bulunamadı." };
    revalidatePath("/admin/support");
    revalidatePath(`/admin/support/${id}`);
    return { success: true as const };
  } catch (err) {
    return actionError(err, "Durum güncellenemedi.");
  }
}

/**
 * Bir bileti ve tüm eklerini siler
 */
export async function deleteSupportTicket(id: string) {
  const denied = await adminOnly();
  if (denied) return denied;
  if (!validId(id)) return { success: false as const, error: "Geçersiz talep." };

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
  const removed = await prisma.supportTicket.deleteMany({ where: { id } });
  if (removed.count === 0) return { success: false as const, error: "Talep bulunamadı." };
  revalidatePath("/admin/support");
  return { success: true as const };
}
