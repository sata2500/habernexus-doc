import "server-only";

import { prisma } from "@/lib/prisma";
import { verifyUserSignature } from "@/lib/newsletter-links";

/** Misafir aboneyi token ile çıkarır */
export async function unsubscribeGuest(token: string) {
  if (!token || token.length > 100) return false;
  const res = await prisma.subscriber.updateMany({ where: { unsubscribeToken: token }, data: { isActive: false } });
  return res.count > 0;
}

/** Kayıtlı kullanıcıyı imzalı bağlantıyla çıkarır (oturum gerekmez) */
export async function unsubscribeUser(userId: string, sig: string) {
  if (!userId || userId.length > 100 || !verifyUserSignature(userId, sig)) return false;
  const res = await prisma.user.updateMany({ where: { id: userId }, data: { newsletterSubscribed: false } });
  return res.count > 0;
}

/** Çift onay: e-postadaki bağlantıya tıklanınca misafir abonelik etkinleşir */
export async function confirmGuest(token: string) {
  if (!token || token.length > 100) return false;
  const res = await prisma.subscriber.updateMany({ where: { unsubscribeToken: token }, data: { isActive: true } });
  return res.count > 0;
}
