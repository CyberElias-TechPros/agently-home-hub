/**
 * AuthN / AuthZ middleware for Hono.
 */

import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from './types';
import { verifyAccessToken } from './jwt';
import { ApiError } from './errors';

type Ctx = { Bindings: Env; Variables: Variables };

export const requireAuth = createMiddleware<Ctx>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw ApiError.unauthorized('Access token required');
  const user = await verifyAccessToken(c.env, token);
  if (!user) throw ApiError.unauthorized('Invalid or expired token');
  c.set('user', user);
  await next();
});

/** Require one of the given roles (admin always passes). */
export function requireRole(...roles: string[]) {
  return createMiddleware<Ctx>(async (c, next) => {
    const user = c.get('user');
    if (!user) throw ApiError.unauthorized('Authentication required');
    if (roles.length === 0 || user.role === 'admin' || roles.includes(user.role)) {
      await next();
      return;
    }
    throw ApiError.forbidden(`Requires ${roles.join(' or ')} role`);
  });
}

/** Get the authenticated user id, or throw. */
export function currentUserId(c: { get: (k: 'user') => AuthUserLike | undefined }): string {
  const user = c.get('user');
  if (!user) throw ApiError.unauthorized('Authentication required');
  return user.sub;
}

type AuthUserLike = { sub: string };
