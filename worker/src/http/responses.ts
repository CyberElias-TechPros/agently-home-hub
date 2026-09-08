import type { AppConfig } from '../env';

/**
 * Success responses.
 *
 * Envelope convention (mirrored by the frontend client):
 *   success -> `{ data: ... }`, with `{ data, pagination }` for collections
 *   error   -> `{ error: { code, message, request_id, details? } }`
 *
 * Handlers build the `{ data: ... }` object themselves so that collections can
 * carry `pagination` alongside `data`, and so that auth endpoints can return
 * `{ user, tokens }` without a redundant wrapper.
 */
export function ok(body: object, status = 200, headers?: HeadersInit): Response {
  return json(body, status, headers);
}

export function created(body: object): Response {
  return json(body, 201);
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

/** Security headers applied to every response, including errors. */
export function securityHeaders(config: AppConfig): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Api-Version': config.apiVersion,
  };
}

export function corsHeaders(origin: string | null, config: AppConfig): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin, config)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key, X-Request-Id',
    'Access-Control-Expose-Headers': 'X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function isAllowedOrigin(origin: string, config: AppConfig): boolean {
  if (config.allowedOrigins.includes(origin)) return true;
  // Preview deployments: https://<something>.agently.pages.dev / vercel.app
  const hostname = safeHostname(origin);
  if (!hostname) return false;
  if (config.environment !== 'production') {
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  return false;
}

function safeHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}
