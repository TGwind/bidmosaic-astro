/**
 * Simple in-memory rate limiter for API routes.
 * No external dependencies — uses a Map with automatic cleanup.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [, store] of buckets) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given key (typically client IP).
 * Returns null if allowed, or a Response (429) if limit exceeded.
 */
export function checkRateLimit(
  bucketName: string,
  key: string,
  maxRequests: number,
  windowMs: number,
): Response | null {
  if (!buckets.has(bucketName)) buckets.set(bucketName, new Map());
  const store = buckets.get(bucketName)!;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: 'Too many requests, please try again later' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  return null;
}

/** Extract client IP from request (works with Vercel, Cloudflare, nginx) */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}
