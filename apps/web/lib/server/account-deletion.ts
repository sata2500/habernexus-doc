import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Bir hesabı güvenle siler:
 * - Sistemdeki son yönetici silinemez (panel sahipsiz kalmasın).
 * - Kullanıcının yazdığı haberler silinmez; başka bir yöneticiye devredilir (yayındaki haberler kaybolmasın).
 * Yorumlar, kaydedilenler, okuma geçmişi, tepkiler, oturumlar ve bağlı hesaplar ilişkilerle birlikte silinir;
 * aynı adresin misafir bülten kaydı da silinir.
 */
export async function deleteAccountSafely(userId: string): Promise<{ success: true; reassigned: number } | { success: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true } });
  if (!user) return { success: false, error: "Kullanıcı bulunamadı." };

  const otherAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", id: { not: userId } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (user.role === "ADMIN" && !otherAdmin) {
    return { success: false, error: "Sistemdeki son yönetici hesabı silinemez. Önce başka bir kullanıcıyı yönetici yapın." };
  }

  const articleCount = await prisma.article.count({ where: { authorId: userId } });
  if (articleCount > 0 && !otherAdmin) {
    return { success: false, error: "Bu hesabın haberlerini devralacak bir yönetici bulunamadı." };
  }

  await prisma.$transaction([
    ...(articleCount > 0 && otherAdmin ? [prisma.article.updateMany({ where: { authorId: userId }, data: { authorId: otherAdmin.id } })] : []),
    prisma.media.updateMany({ where: { userId }, data: { userId: otherAdmin?.id ?? userId } }),
    // Aynı adresle misafir olarak verilmiş bülten aboneliği de silinir (hesap silinince e-posta adresi kalmasın)
    prisma.subscriber.deleteMany({ where: { email: user.email.toLowerCase() } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  return { success: true, reassigned: articleCount };
}
