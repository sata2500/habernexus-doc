"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { NewsletterEmailSchema } from "@/lib/validation/schemas";

export async function subscribeToNewsletter(email: string) {
  const parsedEmail = NewsletterEmailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { success: false, error: "Geçerli bir e-posta adresi giriniz." };
  }

  const emailLower = parsedEmail.data;
  const rate = checkRateLimit(`newsletter:${emailLower}`, 3, 60 * 60 * 1000);
  if (!rate.allowed) {
    return { success: false, error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      await prisma.subscriber.updateMany({
        where: { email: emailLower },
        data: { isActive: false },
      });

      if (existingUser.newsletterSubscribed) {
        return { success: false, error: "Zaten bültene kayıtlısınız. Ayarlarınızı profilinizden yönetebilirsiniz." };
      }

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { newsletterSubscribed: true },
      });
      return { success: true, message: "Bülten aboneliğiniz profiliniz üzerinden aktifleştirildi!" };
    }

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
