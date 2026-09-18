/**
 * Environment configuration.
 *
 * The API base URL resolves in this order:
 *   1. `VITE_API_URL` env (dev) — e.g. http://127.0.0.1:8787/api
 *   2. same-origin `/api` (production — served by the Cloudflare Worker,
 *      which proxies to the API and serves the built assets).
 */

const envApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/** Base URL for REST calls (no trailing slash). */
export const API_BASE_URL: string = (envApiUrl.trim() || '/api').replace(/\/+$/, '');

/** The app origin (for socket.io / uploads). */
export const API_ORIGIN: string = envApiUrl
  ? envApiUrl.replace(/\/api\/?$/, '')
  : typeof window !== 'undefined'
    ? window.location.origin
    : '';

/** True when we are talking to ourselves (same-origin, behind the Worker). */
export const IS_SAME_ORIGIN: boolean = !envApiUrl;

/** True when running on a Cloudflare Worker (production-ish). */
export const IS_PROD: boolean = import.meta.env.PROD === true;

export function authUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\//, '')}`;
}
