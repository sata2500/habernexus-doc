import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";
import { NewsletterTemplate } from "@/components/mail/NewsletterTemplate";
import { Receiver } from "@upstash/qstash";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

/**
 * Dinamik Saatli Haber Bülteni Otomasyonu (QStash Webhook)
 */
export async function POST(req: NextRequest) {
  // İmza Doğrulaması
  const signature = req.headers.get("upstash-signature");
  const bodyText = await req.text();
  const isValid = await receiver.verify({
    signature: signature || "",
    body: bodyText,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
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
      where: { newsletterSubscribed: true, newsletterTime: currentHourString },
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

    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com";
    
    // 4. Alıcıları Birleştir (De-duplication)
    // Eğer bir e-posta hem User hem de Subscriber tablosunda varsa, User (kayıtlı) olanı önceliklendir.
    const subscribersMap = new Map<string, { email: string; unsubscribeUrl: string }>();

    // Önce misafirleri ekle
    guestSubscribers.forEach(sub => {
      subscribersMap.set(sub.email.toLowerCase(), {
        email: sub.email,
        unsubscribeUrl: `${BASE_URL}/newsletter/unsubscribe?token=${sub.unsubscribeToken}`
      });
    });

    // Sonra kayıtlı kullanıcıları ekle (aynı e-posta varsa üzerine yazar - öncelik User'da)
    userSubscribers.forEach(user => {
      subscribersMap.set(user.email.toLowerCase(), {
        email: user.email,
        unsubscribeUrl: `${BASE_URL}/dashboard/settings`
      });
    });

    const uniqueSubscribers = Array.from(subscribersMap.values());
    let sentCount = 0;

    // 5. E-postaları Gönder
    const emailPromises = uniqueSubscribers.map(sub => {
      return sendEmail({
        to: sub.email,
        subject: `Haber Nexus — ${new Date().toLocaleDateString("tr-TR")} Özetiniz`,
        react: NewsletterTemplate({ articles: latestArticles, unsubscribeUrl: sub.unsubscribeUrl }),
      });
    });

    const results = await Promise.all(emailPromises);
    sentCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      sentCount,
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

export async function GET(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
