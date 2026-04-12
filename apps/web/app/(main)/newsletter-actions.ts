"use server";

import { prisma } from "@/lib/prisma";

export async function subscribeToNewsletter(email: string) {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Geçerli bir e-posta adresi giriniz." };
    }

    const existing = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (!existing.isActive) {
        await prisma.subscriber.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        return { success: true, message: "Aboneliğiniz yeniden aktifleştirildi!" };
      }
      return { success: false, error: "Bu e-posta adresi zaten bültene kayıtlı." };
    }

    await prisma.subscriber.create({
      data: { email },
    });

    return { success: true, message: "Bültene başarıyla abone oldunuz!" };
  } catch (error) {
    console.error("Newsletter error:", error);
    return { success: false, error: "Servis geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin." };
  }
}
