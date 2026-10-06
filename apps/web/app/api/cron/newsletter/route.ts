import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailBatch } from "@/lib/mail";
import { guestUnsubscribeUrl, oneClickUrl, unsubscribeHeaders, userUnsubscribeUrl } from "@/lib/newsletter-links";
import { NewsletterTemplate } from "@/components/mail/NewsletterTemplate";
import { verifyQStashRequest } from "@/lib/server/qstash-verify";

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

    // 3. Son 24 Saat Haberlerini Çek
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const latestArticles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: twentyFourHoursAgo },
      },
      take: 7,
      orderBy: { viewCount: "desc" },
      include: { category: { select: { name: true } } },
    });

    if (latestArticles.length === 0) {
      return NextResponse.json({ message: "No new articles found in last 24h. Skipping newsletter." });
    }

    // 4. Alıcıları birleştir: aynı adres hem kayıtlı kullanıcı hem misafir aboneyse kullanıcı kaydı esas alınır.
    // Her alıcıya kendi tek tıklık abonelikten çıkış bağlantısı verilir (kayıtlı kullanıcılar için oturum gerekmez).
    const recipients = new Map<string, { email: string; unsubscribeUrl: string; oneClick: string }>();
    guestSubscribers.forEach((sub) => {
      recipients.set(sub.email.toLowerCase(), { email: sub.email, unsubscribeUrl: guestUnsubscribeUrl(sub.unsubscribeToken), oneClick: oneClickUrl({ token: sub.unsubscribeToken }) });
    });
    userSubscribers.forEach((user) => {
      recipients.set(user.email.toLowerCase(), { email: user.email, unsubscribeUrl: userUnsubscribeUrl(user.id), oneClick: oneClickUrl({ userId: user.id }) });
    });

    const subject = `Haber Nexus — ${new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })} Özetiniz`;
    const uniqueSubscribers = [...recipients.values()];

    // 5. Toplu ve hız sınırına uygun gönderim
    const { sent: sentCount, failed } = await sendEmailBatch(
      uniqueSubscribers.map((sub) => ({
        to: sub.email,
        subject,
        react: NewsletterTemplate({ articles: latestArticles, unsubscribeUrl: sub.unsubscribeUrl }),
        headers: unsubscribeHeaders(sub.oneClick),
      })),
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
