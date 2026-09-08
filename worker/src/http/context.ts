import type { Context, Next } from 'hono';
import type { Env, AppConfig } from '../env';
import { ApiError } from '../lib/errors';
import { verifyAccessToken, type AccessTokenClaims } from '../lib/jwt';
import type { UserRole } from '../domain/roles';
import { hasRoleAtLeast } from '../domain/roles';

export interface AppVariables {
  requestId: string;
  config: AppConfig;
  auth?: AuthContext;
  rateLimitHeaders?: Record<string, string>;
}

export interface AuthContext {
  userId: string;
  role: UserRole;
  email: string;
  sessionId: string;
}

export type AppEnv = { Bindings: Env; Variables: AppVariables };

export type AppContext = Context<AppEnv>;

/** Reads `Authorization: Bearer <jwt>` and verifies it against the secret. */
export async function authenticate(c: AppContext, next: Next): Promise<Response | void> {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Sign in to continue.');
  }

  const config = c.get('config');
  const result = await verifyAccessToken(header.slice(7).trim(), c.env.JWT_SECRET, {
    issuer: config.issuer,
    audience: config.audience,
  });

  if (!result.ok) {
    // Expired tokens are an expected, recoverable condition; everything else
    // (bad signature, wrong issuer) means the token is not ours at all.
    throw result.reason === 'expired'
      ? ApiError.unauthorized('Your session has expired. Please sign in again.')
      : ApiError.unauthorized('That sign-in token is not valid.');
  }

  const claims: AccessTokenClaims = result.claims;

  // The token can outlive a disabled account, so confirm the user still exists
  // and is enabled before trusting the role it carries.
  const user = await c.env.DB.prepare('SELECT role, disabled_at FROM users WHERE id = ?')
    .bind(claims.sub)
    .first<{ role: string; disabled_at: string | null }>();

  if (!user) throw ApiError.unauthorized('That account no longer exists.');
  if (user.disabled_at) throw ApiError.forbidden('This account has been disabled.');

  c.set('auth', {
    userId: claims.sub,
    // The database role wins: it reflects demotions that happened after issue.
    role: user.role as UserRole,
    email: claims.email,
    sessionId: claims.sid,
  });

  await next();
}

/**
 * Resolves the caller when a token is present, but never rejects an anonymous
 * request. Used for endpoints that are public yet personalised when signed in
 * (property browsing, for example).
 */
export async function optionalAuth(c: AppContext, next: Next): Promise<Response | void> {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return next();

  const config = c.get('config');
  const result = await verifyAccessToken(header.slice(7).trim(), c.env.JWT_SECRET, {
    issuer: config.issuer,
    audience: config.audience,
  });
  if (!result.ok) {
    // A stale token on a public page should degrade to anonymous, not error —
    // the client clears it and retries on the next authenticated request.
    return next();
  }

  const user = await c.env.DB.prepare('SELECT role, disabled_at FROM users WHERE id = ?')
    .bind(result.claims.sub)
    .first<{ role: string; disabled_at: string | null }>();

  if (!user || user.disabled_at) return next();

  c.set('auth', {
    userId: result.claims.sub,
    role: user.role as UserRole,
    email: result.claims.email,
    sessionId: result.claims.sid,
  });

  return next();
}

export function requireAuth(): (c: AppContext, next: Next) => Promise<void> {
  return async (c, next) => {
    if (!c.get('auth')) throw ApiError.unauthorized('Sign in to continue.');
    await next();
  };
}

export function requireRole(minimum: UserRole) {
  return async (c: AppContext, next: Next) => {
    const auth = c.get('auth');
    if (!auth) throw ApiError.unauthorized('Sign in to continue.');
    if (!hasRoleAtLeast(auth.role, minimum)) {
      throw ApiError.forbidden('Your account does not have access to this area.');
    }
    await next();
  };
}

export function requireAnyRole(...roles: UserRole[]) {
  return async (c: AppContext, next: Next) => {
    const auth = c.get('auth');
    if (!auth) throw ApiError.unauthorized('Sign in to continue.');
    if (!roles.includes(auth.role)) {
      throw ApiError.forbidden('Your account does not have access to this area.');
    }
    await next();
  };
}

export function currentAuth(c: AppContext): AuthContext {
  const auth = c.get('auth');
  if (!auth) throw ApiError.unauthorized('Sign in to continue.');
  return auth;
}

/**
 * Reads a required path parameter.
 *
 * Hono types params as possibly-undefined; routes should never silently proceed
 * with an empty id, so this turns a missing parameter into a 400.
 */
export function requireParam(c: AppContext, name: string): string {
  const value = c.req.param(name);
  if (!value) throw ApiError.badRequest(`Missing "${name}" in the request path.`);
  return value;
}
