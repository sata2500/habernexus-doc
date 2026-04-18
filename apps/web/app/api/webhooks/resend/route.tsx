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
      
      const { from, subject, text, html } = emailData;
      const emailMatch = from.match(/<([^>]+)>/) || [null, from];
      const userEmail = emailMatch[1] || from;

      let ticket = await prisma.supportTicket.findFirst({
        where: { userEmail, status: { in: ["OPEN", "PENDING"] } },
        orderBy: { updatedAt: "desc" },
      });

      if (!ticket) {
        ticket = await prisma.supportTicket.create({
          data: { subject: subject || "Konusuz Mesaj", userEmail, status: "OPEN", priority: "NORMAL" },
        });
        logs.push(`Yeni bilet: ${ticket.id}`);
      }

      // GELİŞMİŞ EK YAKALAMA MANTIĞI
      const rawAttachments = emailData.attachments || [];
      const uploadedAttachments = [];
      
      logs.push(`Tespit edilen ek sayisi: ${rawAttachments.length}`);

      if (rawAttachments.length > 0) {
        // İlk ekin anahtarlarını dökerek Resend'in ne gönderdiğini kesinleştirelim
        logs.push(`Ilk ek objesi anahtarlari: ${Object.keys(rawAttachments[0]).join(", ")}`);

        const { put } = require("@vercel/blob");
        for (const att of rawAttachments) {
          // Resend veya diğer sağlayıcılarda isim/içerik farklı keylerde olabilir
          const fileName = att.name || att.filename || att.fileName || "adsiz_dosya";
          const fileContent = att.content || att.data || att.contentBytes;
          const contentType = att.content_type || att.contentType || "application/octet-stream";

          if (fileContent) {
            try {
              logs.push(`Yukleniyor: ${fileName} (${contentType})`);
              const buffer = Buffer.from(fileContent, 'base64');
              const blob = await put(`support/${ticket.id}/${fileName}`, buffer, {
                contentType: contentType,
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
              });
              
              logs.push(`Yuklendi: ${blob.url}`);
              uploadedAttachments.push({
                name: fileName,
                url: blob.url,
                contentType: contentType,
                size: att.size || 0
              });
            } catch (uploadError) {
              logs.push(`Yukleme hatasi (${fileName}): ${uploadError}`);
            }
          } else {
            logs.push(`HATA: ${fileName} icin icerik bulunamadi (content/data bos)`);
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

      // BİLDİRİMLERİ GERİ GETİR
      try {
        const isNewTicket = (ticket as any).createdAt.getTime() === (ticket as any).updatedAt.getTime();
        if (isNewTicket) {
          await sendEmail({
            to: userEmail,
            from: "Haber Nexus Destek <support@habernexus.com>",
            subject: "Mesajınız Alındı - #" + ticket.id,
            react: <SupportReceiptTemplate ticketId={ticket.id} subject={subject || ""} />
          });
          logs.push("Kullaniciya teyit maili gonderildi.");
        }

        await sendEmail({
          to: "salihtanriseven25@gmail.com",
          from: "Haber Nexus Sistem <system@habernexus.com>",
          subject: "Yeni Destek Mesajı: " + (subject || "Konusuz"),
          react: (
            <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
              <h2 style={{ color: '#3b82f6' }}>Yeni Mesaj!</h2>
              <p><b>Gönderen:</b> {userEmail}</p>
              <p><b>Konu:</b> {subject}</p>
              <hr />
              <p>{text || "(İçerik yok)"}</p>
              <a href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/support/${ticket.id}`} style={{
                display: 'inline-block', padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '8px', marginTop: '20px'
              }}>Panelden Yanıtla</a>
            </div>
          )
        });
        logs.push("Admine bildirim gonderildi.");
      } catch (mailErr) {
        logs.push(`Mail gonderim hatasi: ${mailErr}`);
      }

      logs.push("Islem basariyla tamamlandi.");
    } catch (error) {
      logs.push(`Kritik Islem Hatasi: ${error}`);
    }
  }

  console.error(logs.join("\n"));
  return NextResponse.json({ received: true });
}
