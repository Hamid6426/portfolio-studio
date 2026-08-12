type RateBucket = {
  attempts: number[];
  lockUntil: number;
};

/** Fixed window: 10 attempts / 15 minutes (plan 2e). */
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 10;
const LOCK_MS = 15 * 60_000;

const buckets = new Map<string, RateBucket>();

function prune(now: number, attempts: number[]): number[] {
  return attempts.filter((at) => now - at < WINDOW_MS);
}

/**
 * Best-effort client IP for rate limiting.
 * Prefer a single-IP header from a trusted reverse proxy. The first
 * `x-forwarded-for` hop is still client-spoofable without one — document that
 * operators should terminate TLS at a proxy that overwrites these headers.
 */
export function clientIpFromRequest(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "local";
}

/**
 * In-memory fixed-window limiter keyed by IP + email.
 * Suitable for a single-node self-host; replace with Redis if you scale out.
 * Per-process only — each replica has its own buckets.
 */
export function checkLoginRateLimit(
  ip: string,
  email: string,
): { ok: true } | { ok: false; message: string } {
  const key = `${ip.trim()}|${email.trim().toLowerCase()}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? { attempts: [], lockUntil: 0 };

  if (bucket.lockUntil > now) {
    return {
      ok: false,
      message: "Too many sign-in attempts. Try again in a few minutes.",
    };
  }

  bucket.attempts = prune(now, bucket.attempts);
  if (bucket.attempts.length >= MAX_ATTEMPTS) {
    bucket.lockUntil = now + LOCK_MS;
    bucket.attempts = [];
    buckets.set(key, bucket);
    return {
      ok: false,
      message: "Too many sign-in attempts. Try again in a few minutes.",
    };
  }

  bucket.attempts.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}
