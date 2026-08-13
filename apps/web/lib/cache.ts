interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Cache'ten veri alır veya belirtilen async fonksiyonu çağırıp cache'e kaydeder.
   * @param key Cache anahtarı
   * @param ttlSeconds Yaşam süresi (saniye)
   * @param fetcher Veriyi veritabanından/API'den getiren fonksiyon
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && existing.expiresAt > now) {
      return existing.data as T;
    }

    const freshData = await fetcher();
    this.cache.set(key, {
      data: freshData,
      expiresAt: now + ttlSeconds * 1000,
    });

    return freshData;
  }

  /**
   * Belirli bir anahtarı cache'ten temizler.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Pattern ile eşleşen cache anahtarlarını temizler (örn: "article:*").
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Tüm cache'i temizler.
   */
  clear(): void {
    this.cache.clear();
  }
}

export const memoryCache = new MemoryCache();
