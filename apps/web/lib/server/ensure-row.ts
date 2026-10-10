import "server-only";

/**
 * Tek satırlık ayar tablolarını (id = "global") okur; satır yoksa oluşturur.
 * Aynı sayfadaki birkaç bileşen satırı aynı anda oluşturmaya çalışabilir: Prisma'nın upsert'i her
 * durumda tek SQL komutu (ON CONFLICT) olmadığından ikinci istek benzersizlik hatası (P2002) alıyordu.
 * Bu durumda satır zaten oluşmuştur; yeniden okunur.
 */
export async function findOrCreate<T>(find: () => Promise<T | null>, create: () => Promise<T>): Promise<T> {
  const existing = await find();
  if (existing) return existing;
  try {
    return await create();
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") throw error;
    const row = await find();
    if (!row) throw error;
    return row;
  }
}
