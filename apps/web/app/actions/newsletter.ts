"use server";

import { unsubscribeGuest, unsubscribeUser } from "@/lib/server/newsletter";

/**
 * Abonelikten çıkış (sayfadaki onay düğmesi). Bağlantıyı açmak tek başına çıkış yapmaz:
 * e-posta güvenlik tarayıcıları bağlantıları otomatik açtığı için okur istemeden çıkarılıyordu.
 */
export async function unsubscribeByToken(token: string) {
  try {
    return (await unsubscribeGuest(token))
      ? { success: true as const }
      : { success: false as const, error: "Abonelik bulunamadı veya daha önce iptal edilmiş." };
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return { success: false as const, error: "İşlem sırasında bir hata oluştu." };
  }
}

export async function unsubscribeSignedUser(userId: string, sig: string) {
  try {
    return (await unsubscribeUser(userId, sig))
      ? { success: true as const }
      : { success: false as const, error: "Bağlantı geçersiz." };
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return { success: false as const, error: "İşlem sırasında bir hata oluştu." };
  }
}
