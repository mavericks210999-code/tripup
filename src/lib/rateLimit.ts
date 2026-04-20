/**
 * In-memory sliding-window rate limiter.
 *
 * Works per-serverless-instance (no cross-instance state).
 * Good enough for catching abuse from a single client; combine
 * with auth (requireAuth) as the primary defense.
 *
 * For multi-instance production hardening, swap the Map for
 * Upstash Redis + @upstash/ratelimit (free tier available).
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Prune expired windows to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, w] of store.entries()) {
    if (w.resetAt < now) store.delete(key);
  }
}, 60_000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key       Unique key — use userId + route, e.g. "uid:abc123:minerva"
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window length in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return {
    allowed: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
  };
}

/** Returns a 429 response body + headers for a rate-limited request. */
export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return {
    body: { error: 'Too many requests. Please slow down.' },
    headers: {
      'Retry-After': String(retryAfter),
      'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    },
  };
}
