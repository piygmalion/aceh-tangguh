import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

/** Cached Upstash limiters keyed by `${limit}:${windowMs}`. */
const upstashLimiters = new Map<string, Ratelimit>();

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    const first = Array.from(buckets.keys())[0];
    if (first) buckets.delete(first);
  }
}

/** In-memory limiter (per instance). Returns true when the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  prune(now);
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function upstashLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  const cached = upstashLimiters.get(cacheKey);
  if (cached) return cached;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: "aceh-tangguh",
    analytics: false,
  });
  upstashLimiters.set(cacheKey, limiter);
  return limiter;
}

export type RateLimitOutcome =
  | { allowed: true }
  | { allowed: false; reason: "too_many_requests" }
  | { allowed: false; reason: "rate_limit_unconfigured" };

/**
 * Distributed rate limit via Upstash Redis.
 * Production requires Upstash; development falls back to in-memory.
 */
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitOutcome> {
  if (isUpstashConfigured()) {
    try {
      const result = await upstashLimiter(limit, windowMs).limit(key);
      return result.success
        ? { allowed: true }
        : { allowed: false, reason: "too_many_requests" };
    } catch (err) {
      console.error("[rate-limit] Upstash error — denying request:", err);
      return { allowed: false, reason: "too_many_requests" };
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[rate-limit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production"
    );
    return { allowed: false, reason: "rate_limit_unconfigured" };
  }

  return rateLimit(key, limit, windowMs)
    ? { allowed: true }
    : { allowed: false, reason: "too_many_requests" };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export const HOUR_MS = 60 * 60 * 1000;
