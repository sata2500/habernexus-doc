interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __haberNexusRateLimits?: Map<string, RateLimitEntry>;
};

const entries = globalForRateLimit.__haberNexusRateLimits ?? new Map<string, RateLimitEntry>();
globalForRateLimit.__haberNexusRateLimits = entries;

export function checkRateLimit(key: string, limit: number, windowMs: number) {
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
