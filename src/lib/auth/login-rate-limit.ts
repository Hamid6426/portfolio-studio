type RateBucket = {
  attempts: number[];
  lockUntil: number;
};

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const LOCK_MS = 5 * 60_000;

const buckets = new Map<string, RateBucket>();

function prune(now: number, attempts: number[]): number[] {
  return attempts.filter((at) => now - at < WINDOW_MS);
}

/**
 * In-memory sliding-window limiter keyed by IP + email.
 * Suitable for a single-node self-host; replace with Redis if you scale out.
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
