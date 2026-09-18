/**
 * JWT sign/verify using `jose` (Web Crypto). No Node-only dependencies.
 */

import { SignJWT, jwtVerify } from 'jose';
import type { AuthUser, Env } from './types';
import { jwtSecret, DEFAULT_ACCESS_TTL_SECONDS, DEFAULT_REFRESH_TTL_SECONDS } from './config';

/** Build a raw HMAC key (Uint8Array) for HS256 signing. */
function hsKey(env: Env, refresh: boolean) {
  return new TextEncoder().encode(jwtSecret(env, refresh));
}

export async function signAccessToken(env: Env, user: AuthUser): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setIssuer('agently')
    .setAudience('agently-app')
    .setExpirationTime(`${DEFAULT_ACCESS_TTL_SECONDS}s`)
    .sign(hsKey(env, false));
}

export async function signRefreshToken(env: Env, user: AuthUser): Promise<string> {
  return new SignJWT({ role: user.role, kind: 'refresh' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setIssuer('agently')
    .setAudience('agently-app')
    .setExpirationTime(`${DEFAULT_REFRESH_TTL_SECONDS}s`)
    .sign(hsKey(env, true));
}

/** Verify an access token. Returns AuthUser or null. */
export async function verifyAccessToken(env: Env, token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, hsKey(env, false), {
      issuer: 'agently',
      audience: 'agently-app',
    });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: (payload.email as string) ?? '',
      role: (payload.role as string) ?? 'tenant',
      name: payload.name as string | undefined,
    };
  } catch {
    return null;
  }
}

/** Verify a refresh token. Returns AuthUser (with role) or null. */
export async function verifyRefreshToken(env: Env, token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, hsKey(env, true), {
      issuer: 'agently',
      audience: 'agently-app',
    });
    if (!payload.sub || payload.kind !== 'refresh') return null;
    return {
      sub: payload.sub,
      email: '',
      role: (payload.role as string) ?? 'tenant',
    };
  } catch {
    return null;
  }
}
