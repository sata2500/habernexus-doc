import { prisma } from "@/lib/prisma";

/** Admin panelinde editoryal kriter girilmemişse kullanılan varsayılan */
export const DEFAULT_EDITORIAL_CRITERIA = `- Türkiye okurunu doğrudan ilgilendiren, güncel ve yeni gelişmelere yüksek puan ver.
- Kamu yararı, ekonomi, teknoloji, bilim ve önemli dünya olaylarını öne çıkar.
- Magazin dedikodusu, tıklama tuzağı, reklam/basın bülteni ve tekrar eden içeriklere düşük puan ver.
- Doğrulanmamış iddia veya tek kaynaklı söylentileri düşük puanla.`;

/**
 * Eski RSS öğelerini temizler.
 */
export async function cleanupOldItems(): Promise<number> {
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "global" }, select: { rssRetentionDays: true } });
    const retentionDays = settings?.rssRetentionDays || 14;
    const deleteBefore = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await prisma.rssFeedItem.deleteMany({
      where: {
        usedForArticle: false, // Makale yazılmamış olanları sil
        // Yayın tarihi olmayan öğeler eklenme tarihine göre
        OR: [{ publishedAt: { lt: deleteBefore } }, { publishedAt: null, createdAt: { lt: deleteBefore } }],
      },
    });

    console.log(`[RSS Cleanup] ${result.count} eski öğe temizlendi.`);
    return result.count;
  } catch (error) {
    console.error("RSS Cleanup Error:", error);
    return 0;
  }
}
