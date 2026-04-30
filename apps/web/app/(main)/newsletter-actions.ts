"use server";

import { prisma } from "@/lib/prisma";

export async function subscribeToNewsletter(email: string) {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Geçerli bir e-posta adresi giriniz." };
    }

    const emailLower = email.toLowerCase();

    // 1. Önce kayıtlı bir kullanıcı mı diye bak
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      if (existingUser.newsletterSubscribed) {
        return { success: false, error: "Zaten bültene kayıtlısınız. Ayarlarınızı profilinizden yönetebilirsiniz." };
      }
      
      // Kullanıcı kayıtlı ama bülten kapalıysa aktif et
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { newsletterSubscribed: true },
      });
      return { success: true, message: "Bülten aboneliğiniz profiliniz üzerinden aktifleştirildi!" };
    }

    // 2. Misafir aboneleri kontrol et
    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email: emailLower },
    });

    if (existingSubscriber) {
      if (!existingSubscriber.isActive) {
        await prisma.subscriber.update({
          where: { id: existingSubscriber.id },
          data: { isActive: true },
        });
        return { success: true, message: "Aboneliğiniz yeniden aktifleştirildi!" };
      }
      return { success: false, error: "Bu e-posta adresi zaten bültene kayıtlı." };
    }

    await prisma.subscriber.create({
      data: { email: emailLower },
    });

    return { success: true, message: "Bültene başarıyla abone oldunuz!" };
  } catch (error) {
    console.error("Newsletter error:", error);
    return { success: false, error: "Servis geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin." };
  }
}
