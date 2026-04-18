"use server";

import { prisma } from "@/lib/prisma";

/**
 * Handles guest unsubscription via secure token.
 */
export async function unsubscribeByToken(token: string) {
  if (!token) {
    return { success: false, error: "Geçersiz işlem." };
  }

  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return { success: false, error: "Abonelik bulunamadı veya daha önce iptal edilmiş." };
    }

    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return { success: false, error: "İşlem sırasında bir hata oluştu." };
  }
}
