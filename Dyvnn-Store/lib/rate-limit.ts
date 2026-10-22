import 'server-only';

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

/** Best-effort per-process limiter. Use a shared store for multi-instance production limits. */
export function rateLimit(request: Request, key: string, limit: number, windowMs: number) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = request.headers.get('x-real-ip') ?? forwarded?.split(',').at(-1)?.trim() ?? 'unknown';
  const now = Date.now();
  const bucketKey = `${key}:${ip}`;
  let entry = buckets.get(bucketKey);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(bucketKey, entry);
  }
  entry.count += 1;
  if (buckets.size > 5000) {
    for (const [candidate, value] of buckets) if (value.resetAt <= now) buckets.delete(candidate);
  }
  return { allowed: entry.count <= limit, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
}
