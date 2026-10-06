"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkRateLimitAsync, getActionIdentity } from "@/lib/server/rate-limit";
import { NewsletterEmailSchema } from "@/lib/validation/schemas";
import { sendEmail } from "@/lib/mail";
import { confirmUrl } from "@/lib/newsletter-links";
import { NewsletterConfirmTemplate } from "@/components/mail/NewsletterConfirmTemplate";

export async function subscribeToNewsletter(email: string) {
  const parsedEmail = NewsletterEmailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { success: false, error: "Geçerli bir e-posta adresi giriniz." };
  }

  const emailLower = parsedEmail.data;
  const ipRate = await checkRateLimitAsync(`newsletter-ip:${await getActionIdentity()}`, 10, 60 * 60 * 1000);
  const rate = await checkRateLimitAsync(`newsletter:${emailLower}`, 3, 60 * 60 * 1000);
  if (!ipRate.allowed || !rate.allowed) {
    return { success: false, error: "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin." };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      // Kayıtlı bir hesabın bülten tercihini yalnızca hesabın sahibi değiştirebilir
      const session = await auth.api.getSession({ headers: await headers() });
      if (session?.user.id !== existingUser.id) {
        return {
          success: false,
          error: "Bu e-posta adresi kayıtlı bir hesaba ait. Bülteni giriş yaptıktan sonra hesap ayarlarınızdan açabilirsiniz.",
        };
      }

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

    // Çift onay: abonelik, adresin sahibi e-postadaki bağlantıya tıklayınca başlar.
    // Böylece kimse başkasının adresini abone yapamaz, iptal etmiş birini yeniden ekleyemez.
    if (existingSubscriber?.isActive) {
      return { success: false, error: "Bu e-posta adresi zaten bültene kayıtlı." };
    }
    const subscriber = existingSubscriber ?? (await prisma.subscriber.create({ data: { email: emailLower, isActive: false } }));

    const mail = await sendEmail({
      to: emailLower,
      subject: "Haber Nexus bülten aboneliğinizi onaylayın",
      react: NewsletterConfirmTemplate({ confirmUrl: confirmUrl(subscriber.unsubscribeToken) }),
    });
    if (!mail.success) {
      return { success: false, error: "Onay e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin." };
    }
    return { success: true, message: "Son bir adım: e-posta adresinize gelen bağlantıya tıklayarak aboneliğinizi onaylayın." };
  } catch (error) {
    console.error("Newsletter error:", error);
    return { success: false, error: "Servis geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin." };
  }
}
