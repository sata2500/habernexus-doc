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

  try {
    event = wh.verify(payload, headers) as any;
    console.log("Webhook dogrulandi. Event Type:", event.type);
    console.log("Event Data Payload:", JSON.stringify(event.data, null, 2));
  } catch (err) {
    console.error("Webhook doğrulama başarısız:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Sadece gelen mail (email.received) olaylarını işle
  if (event.type === "email.received") {
    const emailId = event.data.email_id;
    console.log("Mail ID alindi (email.received):", emailId);
    
    // 1. Resend API üzerinden mailin TAM içeriğini çek (Webhook sadece meta veri gönderir)
    try {
      const { data: fullEmail, error: fetchError } = await resendClient.emails.receiving.get(emailId);
      
      if (fetchError || !fullEmail) {
        console.error("Resend API Hatasi:", fetchError);
        return NextResponse.json({ 
            error: "Failed to fetch email content", 
            details: fetchError || "Email data is empty" 
        }, { status: 500 });
      }

      console.log("Full Email Keys:", Object.keys(fullEmail));
      const { from, subject, text, html } = fullEmail as any;

      // "Ad Soyad <email@example.com>" formatından sadece email'i ayıkla
      const emailMatch = from.match(/<([^>]+)>/) || [null, from];
      const userEmail = emailMatch[1] || from;

      // 2. Mevcut bir açık bilet var mı bak (Aynı kullanıcı + Benzer konu + OPEN/PENDING durumu)
      let ticket = await prisma.supportTicket.findFirst({
        where: {
          userEmail: userEmail,
          status: { in: ["OPEN", "PENDING"] },
        },
        orderBy: { updatedAt: "desc" },
      });

      // 3. Bilet yoksa yeni oluştur
      if (!ticket) {
        ticket = await prisma.supportTicket.create({
          data: {
            subject: subject || "Konusuz Mesaj",
            userEmail: userEmail,
            status: "OPEN",
            priority: "NORMAL",
          },
        });
      }

      // 4. Mesajı bilete ekle
      // Ekleri işle (Eğer varsa)
      const attachments = (fullEmail as any).attachments || [];
      const uploadedAttachments = [];
      
      console.log(`Mail icerigi alindi. Ek sayisi: ${attachments.length}`);
      if (attachments.length > 0) {
        console.log("Ek isimleri:", attachments.map((a: any) => a.name).join(", "));
      }

      if (attachments.length > 0) {
        const { put } = require("@vercel/blob");
        for (const att of attachments) {
          try {
            console.log(`Ek yukleniyor: ${att.name} (${att.content_type})`);
            // Base64 içeriği Buffer'a çevir ve Vercel Blob'a yükle
            const buffer = Buffer.from(att.content, 'base64');
            const blob = await put(`support/${ticket.id}/${att.name}`, buffer, {
              contentType: att.content_type,
              access: 'public',
              token: process.env.BLOB_READ_WRITE_TOKEN
            });
            
            console.log(`Ek yuklendi: ${blob.url}`);
            uploadedAttachments.push({
              name: att.name,
              url: blob.url,
              contentType: att.content_type,
              size: att.size
            });
          } catch (uploadError) {
            console.error(`Ek yukleme hatasi (${att.name}):`, uploadError);
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

      // 5. Bileti güncelle (son işlem zamanı için)
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      // 6. Otomatik Teyit Mesajı (Sadece yeni bilet açıldığında)
      const isNewTicket = (ticket as any).createdAt === (ticket as any).updatedAt;
      if (isNewTicket) {
        await sendEmail({
          to: userEmail,
          from: "Haber Nexus Destek <support@habernexus.com>",
          subject: "Mesajınız Alındı - #" + ticket.id,
          react: <SupportReceiptTemplate ticketId={ticket.id} subject={subject || ""} />
        });

        // 7. Admin Bildirimi
        await sendEmail({
          to: "salihtanriseven25@gmail.com", // Sizin adresiniz
          from: "Haber Nexus Sistem <system@habernexus.com>",
          subject: "Yeni Destek Talebi: " + (subject || "Konusuz"),
          react: (
            <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
                <h2 style={{ color: '#3b82f6' }}>Yeni Destek Mesajı!</h2>
                <p><b>Gönderen:</b> {userEmail}</p>
                <p><b>Konu:</b> {subject}</p>
                <hr />
                <p>{text || "(İçerik yok)"}</p>
                <a href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/support/${ticket.id}`} style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    marginTop: '20px'
                }}>Paneli Görüntüle</a>
            </div>
          )
        });
      }

      console.log(`Yeni mesaj kaydedildi: Ticket ID ${ticket.id}`);

    } catch (error) {
      console.error("Webhook işlem hatası:", error);
      return NextResponse.json({ error: "Internal processing error", details: (error as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
