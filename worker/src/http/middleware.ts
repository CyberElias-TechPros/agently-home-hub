import type { Next } from 'hono';
import { corsHeaders, securityHeaders } from './responses';
import { consumeRateLimit, rateLimitHeaders, clientIdentifier, RATE_LIMITS, type RateLimitResult } from './rate-limit';
import type { AppContext } from './context';

/**
 * Request pipeline.
 *
 * Order matters: request id → CORS → security headers → rate limit → routes.
 */

export async function withRequestContext(c: AppContext, next: Next) {
  const config = c.get('config');
  const requestId = c.req.header('X-Request-Id') ?? crypto.randomUUID();
  c.set('requestId', requestId);

  const origin = c.req.header('Origin') ?? null;
  const cors = corsHeaders(origin, config);
  const base = { ...securityHeaders(config), 'X-Request-Id': requestId };

  // Pre-flight never reaches route handlers.
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...base, ...cors } });
  }

  await next();

  // Headers must be applied to the response the handler produced. Setting them
  // on the context *before* `next()` does nothing, because every handler
  // returns a fresh Response that never sees them.
  const produced = c.res;
  const headers = new Headers(produced.headers);
  for (const [name, value] of Object.entries(base)) headers.set(name, value);
  for (const [name, value] of Object.entries(cors)) headers.set(name, value);
  c.res = new Response(produced.body, {
    status: produced.status,
    statusText: produced.statusText,
    headers,
  });
}

/**
 * Applies a named rate-limit rule. Fail-open: if KV is unavailable we allow the
 * request through rather than taking the whole API down for a cache outage.
 */
export function withRateLimit(scope: keyof typeof RATE_LIMITS) {
  return async (c: AppContext, next: Next) => {
    const rule = RATE_LIMITS[scope] ?? RATE_LIMITS['read:default'];
    const identifier = clientIdentifier(c.req.raw, c.get('auth')?.userId);
    try {
      const result: RateLimitResult = await consumeRateLimit(c.env.RATE_LIMITS, scope, identifier, rule);
      for (const [name, value] of Object.entries(rateLimitHeaders(result))) {
        c.header(name, value);
      }
      if (!result.allowed) {
        return c.json(
          {
            error: {
              code: 'rate_limited',
              message: 'Too many requests. Please slow down and try again shortly.',
              details: { retry_after: result.retryAfter },
              request_id: c.get('requestId'),
            },
          },
          429
        );
      }
    } catch {
      // Rate limiting is a safety net, not a correctness requirement.
    }
    await next();
  };
}

/** Never let a browser cache an authenticated response. */
export function noStore(c: AppContext, next: Next) {
  if (c.req.header('Authorization')) {
    c.header('Cache-Control', 'no-store');
  }
  return next();
}
