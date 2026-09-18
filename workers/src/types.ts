/**
 * Shared runtime types for the Agently Cloudflare Worker.
 */

/** Worker bindings (defined in wrangler.toml). */
export interface Env {
  DB: D1Database;
  CACHE_KV?: KVNamespace;
  RATE_LIMIT?: KVNamespace;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  /** Optional Postgres fallback for local Node dev (`npm run dev:node`). */
  DATABASE_URL?: string;
}

/** Authenticated user embedded in the JWT (and `c.set('user', …)`). */
export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  name?: string;
}

export type Variables = {
  user?: AuthUser;
};

/** Standard success envelope returned by every endpoint. */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}
