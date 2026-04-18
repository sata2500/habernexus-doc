import { Resend } from "resend";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";
import { SupportReceiptTemplate } from "@/components/mail/SupportReceiptTemplate";

const resendClient = new Resend(process.env.RESEND_API_KEY);

/**
 * Resend Inbound Email Webhook Handler
 * support@habernexus.com gibi adreslere gelen mailleri yakalar.
 */
export async function POST(req: NextRequest) {
  console.log("Resend Webhook tetiklendi...");
  const payload = await req.text();
  const headers = {
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
  let event: any;

  const logs: string[] = [];
  logs.push("Resend Webhook tetiklendi...");

  try {
    event = wh.verify(payload, headers) as any;
    logs.push(`Webhook dogrulandi. Event Type: ${event.type}`);
  } catch (err) {
    console.error("Webhook doğrulama başarısız:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Sadece gelen mail (email.received) olaylarını işle
  if (event.type === "email.received") {
    const emailId = event.data.email_id;
    logs.push(`Mail ID alindi: ${emailId}`);
    
    try {
      const { data: fullEmail, error: fetchError } = await resendClient.emails.receiving.get(emailId);
      
      if (fetchError || !fullEmail) {
        logs.push(`Resend API Hatasi: ${JSON.stringify(fetchError)}`);
        console.error(logs.join("\n"));
        return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 });
      }

      const emailData = fullEmail as any;
      logs.push(`Full Email Keys: ${Object.keys(emailData).join(", ")}`);
      
      const from = emailData.from;
      const subject = emailData.subject;
      const text = emailData.text;
      const html = emailData.html;

      const emailMatch = from.match(/<([^>]+)>/) || [null, from];
      const userEmail = emailMatch[1] || from;

      let ticket = await prisma.supportTicket.findFirst({
        where: {
          userEmail: userEmail,
          status: { in: ["OPEN", "PENDING"] },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!ticket) {
        ticket = await prisma.supportTicket.create({
          data: {
            subject: subject || "Konusuz Mesaj",
            userEmail: userEmail,
            status: "OPEN",
            priority: "NORMAL",
          },
        });
        logs.push(`Yeni bilet olusturuldu: ${ticket.id}`);
      } else {
        logs.push(`Mevcut bilet bulundu: ${ticket.id}`);
      }

      // EK KONTROLÜ
      const attachments = emailData.attachments || [];
      const uploadedAttachments = [];
      
      logs.push(`Ek sayisi: ${attachments.length}`);
      if (attachments.length > 0) {
        logs.push(`Ek detaylari: ${JSON.stringify(attachments.map((a: any) => ({ name: a.name, type: a.content_type, hasContent: !!a.content })))}`);
      }

      if (attachments.length > 0) {
        const { put } = require("@vercel/blob");
        for (const att of attachments) {
          try {
            logs.push(`Yukleniyor: ${att.name}`);
            const buffer = Buffer.from(att.content, 'base64');
            const blob = await put(`support/${ticket.id}/${att.name}`, buffer, {
              contentType: att.content_type,
              access: 'public',
              token: process.env.BLOB_READ_WRITE_TOKEN
            });
            
            logs.push(`Yuklendi: ${blob.url}`);
            uploadedAttachments.push({
              name: att.name,
              url: blob.url,
              contentType: att.content_type,
              size: att.size
            });
          } catch (uploadError) {
            logs.push(`Yukleme hatasi (${att.name}): ${uploadError}`);
          }
        }
      }

      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          sender: userEmail,
          direction: "INBOUND",
          content: text || html || "(İçerik yok)",
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        },
      });

      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      // E-posta gönderim kısımlarını loglara eklemiyorum (zaten çalışıyor)
      logs.push("Mesaj basariyla kaydedildi.");

    } catch (error) {
      logs.push(`Islem Hatasi: ${error}`);
    }
  }

  // TÜM LOGLARI TEK SEFERDE YAZDIR
  console.error(logs.join("\n"));
  return NextResponse.json({ received: true });
}
