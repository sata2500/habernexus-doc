import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";
import { NewsletterTemplate } from "@/components/mail/NewsletterTemplate";
import { render } from "@react-email/render";

/**
 * Günlük Haber Bülteni Otomasyonu (Cron Job)
 * 
 * Vercel Cron tarafından günde bir kez tetiklenir (örn: 08:30).
 * Son 24 saatte yayınlanan en popüler haberleri abonelere e-posta ile iletir.
 */
export async function GET(req: NextRequest) {
  // 1. Yetkilendirme Kontrolü (Sadece Vercel Cron veya yetkili kişiler tetikleyebilir)
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Son 24 Saat Haberlerini Çek
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const latestArticles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: twentyFourHoursAgo },
      },
      take: 7, // En güncel 7 haberi alalım
      orderBy: { viewCount: "desc" }, // En çok ilgi çekenleri üste alalım
      include: { category: { select: { name: true } } },
    });

    if (latestArticles.length === 0) {
      return NextResponse.json({ message: "No new articles found in last 24h. Skipping newsletter." });
    }

    // 3. Alıcı Listesini Oluştur
    // a. Misafir Aboneler
    const guestSubscribers = await prisma.subscriber.findMany({
      where: { isActive: true },
      select: { email: true, unsubscribeToken: true },
    });

    // b. Kayıtlı Üyeler
    const userSubscribers = await prisma.user.findMany({
      where: { newsletterSubscribed: true },
      select: { email: true, id: true },
    });

    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://habernexus.com";
    let sentCount = 0;

    // 4. E-postaları Gönder (Batch processing yerel limitleri aşmamak için basit loop)
    // Gerçek prodüksiyonda Resend Batch API veya bir queue sistemi daha güvenlidir.
    
    // Guest sending
    const guestPromises = guestSubscribers.map(sub => {
      const unsubscribeUrl = `${BASE_URL}/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;
      return sendEmail({
        to: sub.email,
        subject: `Haber Nexus Günlük Özet — ${new Date().toLocaleDateString("tr-TR")}`,
        react: NewsletterTemplate({ articles: latestArticles, unsubscribeUrl }),
      });
    });

    // Registered user sending
    const userPromises = userSubscribers.map(user => {
      const unsubscribeUrl = `${BASE_URL}/dashboard/settings`; // Kayıtlı üyeler profilinden yönetir
      return sendEmail({
        to: user.email,
        subject: `Haber Nexus Günlük Özet — ${new Date().toLocaleDateString("tr-TR")}`,
        react: NewsletterTemplate({ articles: latestArticles, unsubscribeUrl }),
      });
    });

    const results = await Promise.all([...guestPromises, ...userPromises]);
    sentCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      sentCount,
      articleCount: latestArticles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Newsletter Cron Error:", error);
    return NextResponse.json({ error: "Newsletter processing failed" }, { status: 500 });
  }
}
