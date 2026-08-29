interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __haberNexusRateLimits?: Map<string, RateLimitEntry>;
};

const entries = globalForRateLimit.__haberNexusRateLimits ?? new Map<string, RateLimitEntry>();
globalForRateLimit.__haberNexusRateLimits = entries;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * In-memory hızlı ve güvenli sliding-window rate limit kontrolü
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = entries.get(key);

  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpiredEntries(now);
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
  }

  current.count += 1;
  const allowed = current.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.ceil(Math.max(0, current.resetAt - now) / 1000),
  };
}

/**
 * Hibrit (Upstash Redis + Memory Fallback) asenkron rate limit kontrolü.
 * Serverless / Edge ortamlarında dağıtık koruma sağlar.
 */
export async function checkRateLimitAsync(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const redisKey = `ratelimit:${key}`;
      const expireSeconds = Math.ceil(windowMs / 1000);

      // Upstash REST Pipeline: INCR + EXPIRE (sadece ilk seferde)
      const res = await fetch(`${UPSTASH_URL}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["TTL", redisKey],
        ]),
        signal: AbortSignal.timeout(1500),
      });

      if (res.ok) {
        const data = (await res.json()) as Array<{ result: number }>;
        const count = data[0]?.result ?? 1;
        let ttl = data[1]?.result ?? expireSeconds;

        if (ttl === -1) {
          // TTL ayarlı değilse pexpire gönder
          fetch(`${UPSTASH_URL}/EXPIRE/${redisKey}/${expireSeconds}`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
          }).catch(() => undefined);
          ttl = expireSeconds;
        }

        const allowed = count <= limit;
        return {
          allowed,
          remaining: Math.max(0, limit - count),
          retryAfterSeconds: allowed ? 0 : Math.max(1, ttl),
        };
      }
    } catch {
      // Redis erişim hatası durumunda hafıza önbelleğine geri dön
    }
  }

  return checkRateLimit(key, limit, windowMs);
}

function pruneExpiredEntries(now: number) {
  if (entries.size < 10000) return;

  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }
}

export function getRequestIdentity(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

