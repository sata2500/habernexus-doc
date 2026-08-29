interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > now) {
      return existing.data as T;
    }
    if (existing) {
      this.cache.delete(key);
    }
    return null;
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
    });
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetcher();
    await this.set(key, freshData, ttlSeconds);
    return freshData;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Hibrit Dağıtık Önbellek Servisi
 * Upstash Redis yapılandırılmışsa Redis REST API kullanır,
 * aksi halde bellek içi (MemoryCache) fallback ile çalışır.
 */
class DistributedCache {
  private memory = new MemoryCache();
  private redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  private redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  private isRedisConfigured(): boolean {
    return Boolean(this.redisUrl && this.redisToken);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisConfigured()) {
      try {
        const res = await fetch(`${this.redisUrl}/get/cache:${key}`, {
          headers: { Authorization: `Bearer ${this.redisToken}` },
          signal: AbortSignal.timeout(1200),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.result !== null && json.result !== undefined) {
            return typeof json.result === "string" ? JSON.parse(json.result) : json.result;
          }
        }
      } catch {
        // Fallback to memory
      }
    }

    return this.memory.get<T>(key);
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    // Memory cache'i daima güncelle
    await this.memory.set(key, data, ttlSeconds);

    if (this.isRedisConfigured()) {
      try {
        const payload = JSON.stringify(data);
        await fetch(`${this.redisUrl}/setex/cache:${key}/${ttlSeconds}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.redisToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(1200),
        });
      } catch {
        // Silent catch for resilience
      }
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetcher();
    await this.set(key, freshData, ttlSeconds);
    return freshData;
  }

  async invalidate(key: string): Promise<void> {
    this.memory.invalidate(key);

    if (this.isRedisConfigured()) {
      try {
        await fetch(`${this.redisUrl}/del/cache:${key}`, {
          headers: { Authorization: `Bearer ${this.redisToken}` },
          signal: AbortSignal.timeout(1000),
        });
      } catch {
        // Ignored
      }
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    this.memory.invalidatePattern(pattern);

    if (this.isRedisConfigured()) {
      try {
        const scanRes = await fetch(`${this.redisUrl}/keys/cache:${pattern}`, {
          headers: { Authorization: `Bearer ${this.redisToken}` },
          signal: AbortSignal.timeout(1500),
        });

        if (scanRes.ok) {
          const keysData = await scanRes.json();
          const keys = keysData.result as string[];
          if (Array.isArray(keys) && keys.length > 0) {
            await fetch(`${this.redisUrl}/pipeline`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.redisToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(keys.map((k) => ["DEL", k])),
              signal: AbortSignal.timeout(1500),
            });
          }
        }
      } catch {
        // Ignored
      }
    }
  }

  clear(): void {
    this.memory.clear();
  }
}

export const appCache = new DistributedCache();
export const memoryCache = appCache;
