import * as React from "react";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { appCache } from "@/lib/cache";
import { sendEmail } from "@/lib/mail";
import { getAppUrl } from "@/lib/utils";
import { decodeEntities } from "@/lib/news/text";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { SupportReceiptTemplate } from "@/components/mail/SupportReceiptTemplate";
import { AdminNotificationTemplate } from "@/components/mail/AdminNotificationTemplate";

// İstemci ilk kullanımda oluşturulur: dosya yüklenirken oluşturmak anahtar yoksa derlemeyi çökertiyordu
let resendClient: Resend | null = null;
const getResend = () => (resendClient ??= new Resend(process.env.RESEND_API_KEY));

interface RawAttachment {
  name?: string;
  filename?: string;
  content_type?: string;
  size?: number;
}

const MAX_CONTENT = 50_000;

/** Yalnızca HTML gövdeli e-postalar yönetimde etiket yığını olarak görünmesin */
function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

/**
 * Otomatik yanıt verilmeyecek göndericiler: kendi alan adımız (döngü), sistem/teslim
 * edilemedi bildirimleri ve "yanıt vermeyin" adresleri.
 */
function isAutomatedSender(email: string) {
  const own = (() => { try { return new URL(getAppUrl()).hostname.replace(/^www\./, ""); } catch { return "habernexus.com"; } })();
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  return domain === own || /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounce|notifications?)\b/.test(local);
}

/**
 * Resend gelen e-posta webhook'u: support@ adresine gelen mesajları destek taleplerine dönüştürür.
 * İmza (svix) doğrulanır; aynı olay yeniden gönderilirse bir kez işlenir.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Resend Webhook] RESEND_WEBHOOK_SECRET tanımlı değil.");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const payload = await req.text();
  const svixId = req.headers.get("svix-id") || "";
  let event: { type?: string; data?: { email_id?: string } };
  try {
    // svix v2: verify() yalnızca imzayı doğrular, gövdeyi parse etmez
    new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": req.headers.get("svix-timestamp") || "",
      "svix-signature": req.headers.get("svix-signature") || "",
    });
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "email.received" || typeof event.data?.email_id !== "string") {
    return NextResponse.json({ received: true });
  }

  // Yinelenen teslimat (Resend yeniden denemesi) aynı mesajı ikinci kez kaydetmesin
  const dedupeKey = `webhook:resend:${svixId || event.data.email_id}`;
  if (!(await appCache.claim(dedupeKey, 3 * 24 * 3600))) return NextResponse.json({ received: true, duplicate: true });

  try {
    const { data: fullEmail, error: fetchError } = await getResend().emails.receiving.get(event.data.email_id);
    if (fetchError || !fullEmail) {
      console.error("[Resend Webhook] E-posta alınamadı:", fetchError);
      await appCache.invalidate(dedupeKey); // Resend yeniden denediğinde tekrar işlenebilsin
      return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 });
    }

    const from = fullEmail.from || "";
    const userEmail = ((from.match(/<([^>]+)>/)?.[1] ?? from).trim()).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      console.warn("[Resend Webhook] Geçersiz gönderici atlandı:", from.slice(0, 100));
      return NextResponse.json({ received: true });
    }
    const subject = (fullEmail.subject || "").replace(/[\r\n]+/g, " ").trim().slice(0, 300);
    const text = (fullEmail.text || "").trim() || htmlToText(fullEmail.html || "");
    const content = (text || "(İçerik yok)").slice(0, MAX_CONTENT);

    const rawAttachmentsField = (fullEmail as unknown as Record<string, unknown>).attachments;
    const attachments = (Array.isArray(rawAttachmentsField) ? rawAttachmentsField as RawAttachment[] : []).map((att) => ({
      name: String(att.name || att.filename || "dosya").slice(0, 200),
      contentType: String(att.content_type || "application/octet-stream").slice(0, 100),
      size: Number(att.size) || 0,
      status: "METADATA_ONLY" as const,
    }));

    // Açık talebe eklenir ya da yeni talep açılır (tek işlemde)
    const { ticket, isNewTicket } = await prisma.$transaction(async (tx) => {
      const open = await tx.supportTicket.findFirst({
        where: { userEmail, status: { in: ["OPEN", "PENDING"] } },
        orderBy: { updatedAt: "desc" },
      });
      const t = open ?? await tx.supportTicket.create({
        data: { subject: subject || "Konusuz mesaj", userEmail, status: "OPEN", priority: "NORMAL" },
      });
      await tx.supportMessage.create({
        data: {
          ticketId: t.id,
          sender: userEmail,
          direction: "INBOUND",
          content,
          attachments: attachments.length ? JSON.parse(JSON.stringify(attachments)) : undefined,
        },
      });
      // Okur yanıt verdiyse talep yeniden "açık" olur
      await tx.supportTicket.update({ where: { id: t.id }, data: { status: "OPEN", updatedAt: new Date() } });
      return { ticket: t, isNewTicket: !open };
    });

    // Bildirimler ana işlemi etkilemez
    try {
      // Alındı bildirimi: yalnızca yeni talepte, otomatik göndericilere değil, adres başına saatte bir
      if (isNewTicket && !isAutomatedSender(userEmail)) {
        const rate = await checkRateLimitAsync(`support-receipt:${userEmail}`, 1, 60 * 60 * 1000);
        if (rate.allowed) {
          await sendEmail({
            to: userEmail,
            from: "Haber Nexus Destek <support@habernexus.com>",
            subject: `Mesajınız alındı - #${ticket.id}`,
            react: React.createElement(SupportReceiptTemplate, { ticketId: ticket.id, subject }),
          });
        }
      }

      // Yöneticilere bildirim: adres koda gömülmez, yönetici hesaplarından alınır
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", emailVerified: true }, select: { email: true }, take: 5 });
      const appUrl = getAppUrl();
      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          from: "Haber Nexus Sistem <system@habernexus.com>",
          subject: `Yeni destek mesajı: ${subject || "Konusuz"}`,
          react: React.createElement(AdminNotificationTemplate, { ticketId: ticket.id, subject, userEmail, messageText: content.slice(0, 2000), appUrl }),
        });
      }
    } catch (mailErr) {
      console.error("[Resend Webhook] Bildirim hatası:", mailErr);
    }
  } catch (error) {
    console.error("[Resend Webhook] İşleme hatası:", error);
    await appCache.invalidate(dedupeKey);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
