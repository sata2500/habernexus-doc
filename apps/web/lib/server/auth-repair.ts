import "server-only";

import { prisma } from "@/lib/prisma";

let repair: Promise<void> | null = null;

/**
 * Aynı sağlayıcı hesabına (ör. aynı Google hesabı) ait yinelenen Account kayıtlarını temizler.
 *
 * better-auth 1.7.1 Google hesaplarını "issuer + accountId" ile arıyordu; daha eski sürümle açılmış
 * hesaplar bulunamayınca ikinci bir kayıt eklendi. 1.7.7 ise "providerId + accountId" ile arar ve
 * birden fazla kayıt bulursa girişi tamamen durdurur. Her gruptan en güncel kayıt tutulur.
 * Sunucu örneği başına bir kez çalışır; hata girişi engellemez.
 */
export function repairDuplicateOAuthAccounts() {
  repair ??= (async () => {
    try {
      const removed = await prisma.$executeRaw`
        DELETE FROM "Account" a
        USING (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY "providerId", "accountId"
            ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
          ) AS rn
          FROM "Account"
        ) d
        WHERE a.id = d.id AND d.rn > 1`;
      if (removed > 0) console.warn(`[Auth] ${removed} yinelenen hesap bağlantısı temizlendi.`);
    } catch (error) {
      console.error("[Auth] Yinelenen hesap onarımı başarısız:", error);
      repair = null; // bir sonraki istekte yeniden dene
    }
  })();
  return repair;
}
