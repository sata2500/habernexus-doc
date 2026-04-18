import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";
import { SupportReceiptTemplate } from "@/components/mail/SupportReceiptTemplate";

/**
 * Resend Inbound Email Webhook Handler
 * support@habernexus.com gibi adreslere gelen mailleri yakalar.
 */
export async function POST(req: NextRequest) {
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
    console.error("Webhook doğrulama başarısız:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Sadece gelen mail (email.received) olaylarını işle
  if (event.type === "email.received") {
    const emailData = event.data;
    const { from, subject, text, html, to } = emailData;

    try {
      // 1. Mevcut bir açık bilet var mı bak (Aynı kullanıcı + Benzer konu + OPEN/PENDING durumu)
      // Basitlik için sadece mail adresi ve durum üzerinden gidiyoruz.
      let ticket = await prisma.supportTicket.findFirst({
        where: {
          userEmail: from,
          status: { in: ["OPEN", "PENDING"] },
        },
        orderBy: { updatedAt: "desc" },
      });

      // 2. Bilet yoksa yeni oluştur
      if (!ticket) {
        ticket = await prisma.supportTicket.create({
          data: {
            subject: subject || "Konusuz Mesaj",
            userEmail: from,
            status: "OPEN",
            priority: "NORMAL",
          },
        });
      }

      // 3. Mesajı bilete ekle
      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          sender: from,
          direction: "INBOUND",
          content: text || html || "(İçerik yok)",
        },
      });

      // 4. Bileti güncelle (son işlem zamanı için)
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      // 5. Otomatik Teyit Mesajı (Sadece yeni bilet açıldığında)
      const isNewTicket = (ticket as any).createdAt === (ticket as any).updatedAt;
      if (isNewTicket) {
        await sendEmail({
          to: from,
          from: "Haber Nexus Destek <support@habernexus.com>",
          subject: "Mesajınız Alındı - #" + ticket.id,
          react: <SupportReceiptTemplate ticketId={ticket.id} subject={subject || ""} />
        });

        // 6. Admin Bildirimi
        await sendEmail({
          to: "salihtanriseven25@gmail.com", // Sizin adresiniz
          from: "Haber Nexus Sistem <system@habernexus.com>",
          subject: "Yeni Destek Talebi: " + (subject || "Konusuz"),
          react: (
            <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
                <h2 style={{ color: '#3b82f6' }}>Yeni Destek Mesajı!</h2>
                <p><b>Gönderen:</b> {from}</p>
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

    } catch (dbError) {
      console.error("Veritabanı kayıt hatası:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
