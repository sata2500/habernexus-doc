import { Resend } from "resend";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";
import { SupportReceiptTemplate } from "@/components/mail/SupportReceiptTemplate";
import { AdminNotificationTemplate } from "@/components/mail/AdminNotificationTemplate";
import * as React from "react";

const resendClient = new Resend(process.env.RESEND_API_KEY);

/**
 * E-posta ekinin metadata'sını temsil eden tip.
 */
interface AttachmentMetadata {
  name: string;
  contentType: string;
  size: number;
  status: "METADATA_ONLY";
}

/**
 * Resend API'sinden gelen ham ek nesnesi.
 */
interface RawAttachment {
  name?: string;
  filename?: string;
  content_type?: string;
  size?: number;
}

/**
 * Resend Inbound Email Webhook Handler
 * support@habernexus.com gibi adreslere gelen mailleri yakalar.
 */
export async function POST(req: NextRequest) {
  console.log("Resend Webhook tetiklendi...");
  const payload = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id") || "",
    "svix-timestamp": req.headers.get("svix-timestamp") || "",
    "svix-signature": req.headers.get("svix-signature") || "",
  };

  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET eksik!");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const wh = new Webhook(secret);
  let event: Record<string, unknown>;

  try {
    event = wh.verify(payload, svixHeaders) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "email.received") {
    const eventData = event.data as Record<string, unknown>;
    const emailId = eventData.email_id as string;

    try {
      const { data: fullEmail, error: fetchError } =
        await resendClient.emails.receiving.get(emailId);

      if (fetchError || !fullEmail) {
        console.error("Email fetch error:", fetchError);
        return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 });
      }

      const from = fullEmail.from || "";
      const subject = fullEmail.subject || "";
      const text = fullEmail.text || "";
      const html = fullEmail.html || "";
      const rawAttachmentsField = (fullEmail as unknown as Record<string, unknown>).attachments;
      const content = text || html || "(İçerik yok)";
      const emailMatch = from.match(/<([^>]+)>/) || [null, from];
      const userEmail = (emailMatch[1] || from).trim();

      // Bilet bul veya oluştur
      let ticket = await prisma.supportTicket.findFirst({
        where: { userEmail, status: { in: ["OPEN", "PENDING"] } },
        orderBy: { updatedAt: "desc" },
      });

      // Yeni bilet mi açılıyor? DB öncesi belirle.
      const isNewTicket = !ticket;

      if (!ticket) {
        ticket = await prisma.supportTicket.create({
          data: {
            subject: subject || "Konusuz Mesaj",
            userEmail,
            status: "OPEN",
            priority: "NORMAL",
          },
        });
      }

      // Ekleri metadata olarak kaydet
      const rawAttachments = (Array.isArray(rawAttachmentsField) ? rawAttachmentsField : []) as RawAttachment[];
      const attachmentsMetadata: AttachmentMetadata[] = rawAttachments.map((att) => ({
        name: att.name || att.filename || "dosya",
        contentType: att.content_type || "application/octet-stream",
        size: att.size || 0,
        status: "METADATA_ONLY",
      }));

      // Mesajı kaydet
      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          sender: userEmail,
          direction: "INBOUND",
          content: content,
          attachments: attachmentsMetadata.length > 0
            ? JSON.parse(JSON.stringify(attachmentsMetadata))
            : undefined,
        },
      });

      // Bileti güncelle
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      // Bildirimler — try-catch ayrıldı (ana işlemi etkilemez)
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        if (isNewTicket) {
          await sendEmail({
            to: userEmail,
            from: "Haber Nexus Destek <support@habernexus.com>",
            subject: "Mesajınız Alındı - #" + ticket.id,
            react: React.createElement(SupportReceiptTemplate, {
              ticketId: ticket.id,
              subject,
            }),
          });
        }

        await sendEmail({
          to: "salihtanriseven25@gmail.com",
          from: "Haber Nexus Sistem <system@habernexus.com>",
          subject: "Yeni Destek Mesajı: " + (subject || "Konusuz"),
          react: React.createElement(AdminNotificationTemplate, {
            ticketId: ticket.id,
            subject,
            userEmail,
            messageText: text,
            appUrl,
          }),
        });
      } catch (mailErr) {
        console.error("Notification Error:", mailErr);
      }
    } catch (error) {
      console.error("Webhook Processing Error:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
