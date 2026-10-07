import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailBatch } from "@/lib/mail";
import { guestUnsubscribeUrl, oneClickUrl, unsubscribeHeaders, userUnsubscribeUrl } from "@/lib/newsletter-links";
import { NewsletterTemplate } from "@/components/mail/NewsletterTemplate";
import { newsletterDateLabel, newsletterLink, newsletterSubject, newsletterText, selectNewsletterArticles } from "@/lib/newsletter-content";
import { appCache } from "@/lib/cache";
import { verifyQStashRequest } from "@/lib/server/qstash-verify";

// Büyük abone listelerinde toplu gönderim (100'lük partiler) zaman alabilir
export const maxDuration = 300;

/**
 * Dinamik Saatli Haber Bülteni Otomasyonu (QStash Webhook)
 */
export async function POST(req: NextRequest) {
  // İmza Doğrulaması
  // İmza anahtarı yoksa ya da imza geçersizse istek reddedilir
  const verified = await verifyQStashRequest(req);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  try {
    // 1. Mevcut Saati Bul (Türkiye saati ile - UTC+3)
    const turkeyTime = new Date().toLocaleTimeString("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
    });
    const currentHourString = turkeyTime.split(":")[0] + ":00";

    // 2. Alıcı Listesini Oluştur
    const guestSubscribers = await prisma.subscriber.findMany({
      where: { isActive: true, newsletterTime: currentHourString },
      select: { email: true, unsubscribeToken: true },
    });

    const userSubscribers = await prisma.user.findMany({
      // Yalnızca e-posta adresi doğrulanmış kullanıcılar
      where: { newsletterSubscribed: true, emailVerified: true, newsletterTime: currentHourString },
      select: { email: true, id: true },
    });

    if (guestSubscribers.length === 0 && userSubscribers.length === 0) {
      return NextResponse.json({ message: `No subscribers scheduled for ${currentHourString}. Skipping.` });
    }

    // 3. Bülten içeriği: son 24 saatin öne çıkanları (kategori çeşitliliğiyle)
    const latestArticles = await selectNewsletterArticles(7);
    if (latestArticles.length === 0) {
      return NextResponse.json({ message: "No new articles found. Skipping newsletter." });
    }

    // Aynı saat diliminin bülteni iki kez gönderilmesin (QStash yeniden denemesi vb.)
    const dayKey = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    // Tek adımlık kilit: eşzamanlı iki teslimattan yalnızca biri gönderir
    if (!(await appCache.claim(`newsletter:sent:${dayKey}:${currentHourString}`, 3 * 3600))) {
      return NextResponse.json({ message: `Newsletter for ${dayKey} ${currentHourString} already sent. Skipping.` });
    }

    // 4. Alıcıları birleştir: aynı adres hem kayıtlı kullanıcı hem misafir aboneyse kullanıcı kaydı esas alınır.
    // Her alıcıya kendi tek tıklık abonelikten çıkış bağlantısı verilir (kayıtlı kullanıcılar için oturum gerekmez).
    const recipients = new Map<string, { email: string; unsubscribeUrl: string; oneClick: string; registered: boolean }>();
    guestSubscribers.forEach((sub) => {
      recipients.set(sub.email.toLowerCase(), { email: sub.email, unsubscribeUrl: guestUnsubscribeUrl(sub.unsubscribeToken), oneClick: oneClickUrl({ token: sub.unsubscribeToken }), registered: false });
    });
    userSubscribers.forEach((user) => {
      recipients.set(user.email.toLowerCase(), { email: user.email, unsubscribeUrl: userUnsubscribeUrl(user.id), oneClick: oneClickUrl({ userId: user.id }), registered: true });
    });

    const subject = newsletterSubject(latestArticles);
    const dateLabel = newsletterDateLabel();
    const settingsUrl = newsletterLink("/dashboard/settings");
    const uniqueSubscribers = [...recipients.values()];

    // 5. Toplu ve hız sınırına uygun gönderim (HTML + düz metin)
    const { sent: sentCount, failed } = await sendEmailBatch(
      uniqueSubscribers.map((sub) => {
        const userSettings = sub.registered ? settingsUrl : null;
        return {
          to: sub.email,
          subject,
          react: NewsletterTemplate({ articles: latestArticles, unsubscribeUrl: sub.unsubscribeUrl, settingsUrl: userSettings, dateLabel, link: (p) => newsletterLink(p) }),
          text: newsletterText(latestArticles, { unsubscribeUrl: sub.unsubscribeUrl, settingsUrl: userSettings, dateLabel }),
          headers: unsubscribeHeaders(sub.oneClick),
        };
      }),
    );

    return NextResponse.json({
      success: true,
      sentCount,
      failed,
      totalScheduled: uniqueSubscribers.length,
      articleCount: latestArticles.length,
      scheduledTime: currentHourString,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Newsletter QStash Error:", error);
    return NextResponse.json({ error: "Newsletter processing failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
