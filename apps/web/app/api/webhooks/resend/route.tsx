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
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "email.received") {
    const emailId = event.data.email_id;
    
    try {
      const { data: fullEmail, error: fetchError } = await resendClient.emails.receiving.get(emailId);
      
      if (fetchError || !fullEmail) {
        return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 });
      }

      const emailData = fullEmail as any;
      const { from, subject, text, html } = emailData;
      const emailMatch = from.match(/<([^>]+)>/) || [null, from];
      const userEmail = emailMatch[1] || from;

      // Bilet bul veya oluştur
      let ticket = await prisma.supportTicket.findFirst({
        where: { userEmail, status: { in: ["OPEN", "PENDING"] } },
        orderBy: { updatedAt: "desc" },
      });

      if (!ticket) {
        ticket = await prisma.supportTicket.create({
          data: { subject: subject || "Konusuz Mesaj", userEmail, status: "OPEN", priority: "NORMAL" },
        });
      }

      // Ekleri meta veri olarak kaydet (İçerik çekme işlemi ileride eklenebilir)
      const rawAttachments = emailData.attachments || [];
      const attachmentsMetadata = rawAttachments.map((att: any) => ({
        name: att.name || att.filename || "dosya",
        contentType: att.content_type || "application/octet-stream",
        size: att.size || 0,
        status: "METADATA_ONLY" // İçeriğin henüz parse edilmediğini belirtmek için
      }));

      // Mesajı kaydet
      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          sender: userEmail,
          direction: "INBOUND",
          content: text || html || "(İçerik yok)",
          attachments: attachmentsMetadata.length > 0 ? attachmentsMetadata : undefined,
        },
      });

      // Bilet güncelle
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      // Bildirimler
      try {
        const isNewTicket = ticket.createdAt.getTime() === new Date().getTime(); // Yaklaşık kontrol
        if (isNewTicket) {
          await sendEmail({
            to: userEmail,
            from: "Haber Nexus Destek <support@habernexus.com>",
            subject: "Mesajınız Alındı - #" + ticket.id,
            react: <SupportReceiptTemplate ticketId={ticket.id} subject={subject || ""} />
          });
        }

        await sendEmail({
          to: "salihtanriseven25@gmail.com",
          from: "Haber Nexus Sistem <system@habernexus.com>",
          subject: "Yeni Destek Mesajı: " + (subject || "Konusuz"),
          react: (
            <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
              <h2 style={{ color: '#3b82f6' }}>Yeni Destek Mesajı</h2>
              <p><b>Gönderen:</b> {userEmail}</p>
              <p><b>Konu:</b> {subject}</p>
              <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
              <p style={{ whiteSpace: 'pre-wrap' }}>{text || "(İçerik yok)"}</p>
              <a href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/support/${ticket.id}`} style={{
                display: 'inline-block', padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '8px', marginTop: '20px', fontWeight: 'bold'
              }}>Panelden Yanıtla</a>
            </div>
          )
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
