/**
 * Configuration and small helpers derived from environment.
 */

import type { Env } from './types';

export const DEFAULT_ACCESS_TTL_SECONDS = 60 * 60; // 1 hour
export const DEFAULT_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const VERIFICATION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const RESET_TTL_SECONDS = 60 * 60; // 1 hour
export const PBKDF2_ITERATIONS = 100_000;

export function jwtSecret(env: Env, refresh = false): string {
  const s = refresh ? env.JWT_REFRESH_SECRET : env.JWT_SECRET;
  return s && s.length >= 16 && s !== 'replace-me-with-a-strong-secret' && s !== 'replace-me-with-a-refresh-secret'
    ? s
    : (refresh ? 'agently-refresh-dev-secret-change-me' : 'agently-jwt-dev-secret-change-me');
}

/** Whether CORS should be wide open (local/dev) — production uses same-origin. */
export function allowAllOrigins(env: Env): boolean {
  return env.ALLOWED_ORIGINS === '*' || env.ENVIRONMENT === 'development';
}

export function isProd(env: Env): boolean {
  return env.ENVIRONMENT !== 'development';
}
