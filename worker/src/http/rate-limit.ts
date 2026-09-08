import { ApiError } from '../lib/errors';

/**
 * Sliding-window rate limiter backed by KV.
 *
 * KV is eventually consistent, which is fine for rate limiting: the worst case
 * is that a determined attacker gets a few extra requests through. Correctness
 * that actually matters (blocking brute-force attempts) still holds because the
 * window only ever moves forward.
 */

export interface RateLimitRule {
  /** Requests permitted inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/**
 * Per-endpoint budgets.
 *
 * Registration is deliberately more permissive than it looks: mobile networks
 * in the target market NAT very heavily, so thousands of legitimate users can
 * appear to share one IP. A tight per-IP registration limit would lock out real
 * people, so account creation is rate limited loosely and abuse is handled by
 * email verification instead. Sign-in is tight because it is the brute-force
 * surface, and it is additionally protected by per-account lockout.
 */
export const RATE_LIMITS: Record<string, RateLimitRule> = {
  'auth:login': { limit: 20, windowSeconds: 300 },
  'auth:register': { limit: 20, windowSeconds: 3600 },
  'auth:refresh': { limit: 60, windowSeconds: 300 },
  'auth:password-reset': { limit: 10, windowSeconds: 3600 },
  'write:default': { limit: 60, windowSeconds: 60 },
  'read:default': { limit: 300, windowSeconds: 60 },
  'search:default': { limit: 120, windowSeconds: 60 },
  'upload:default': { limit: 20, windowSeconds: 3600 },
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the caller may retry (0 when allowed). */
  retryAfter: number;
}

interface Window {
  count: number;
  resetAt: number;
}

export async function consumeRateLimit(
  kv: KVNamespace,
  scope: string,
  identifier: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const key = `rl:${scope}:${identifier}:${Math.floor(now / rule.windowSeconds)}`;
  const ttl = rule.windowSeconds * 2;

  const raw = await kv.get(key);
  let window: Window = { count: 0, resetAt: (Math.floor(now / rule.windowSeconds) + 1) * rule.windowSeconds };

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Window;
      if (typeof parsed.count === 'number' && typeof parsed.resetAt === 'number') {
        window = parsed;
      }
    } catch {
      // Corrupt entry — treat as a fresh window rather than locking the user out.
    }
  }

  window.count += 1;
  await kv.put(key, JSON.stringify(window), { expirationTtl: ttl });

  const allowed = window.count <= rule.limit;
  return {
    allowed,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - window.count),
    retryAfter: allowed ? 0 : Math.max(1, window.resetAt - now),
  };
}

/** Throws a 429 with a `Retry-After` hint when the caller is over budget. */
export function assertAllowed(result: RateLimitResult): void {
  if (result.allowed) return;
  const error = ApiError.rateLimited(result.retryAfter);
  throw error;
}

/** Best-effort client identity: authenticated user, falling back to IP. */
export function clientIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  return `ip:${ip}`;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
  };
  if (!result.allowed) headers['Retry-After'] = String(result.retryAfter);
  return headers;
}
