/**
 * Unified HTTP client for the Agently frontend.
 *
 * Responsibilities:
 *  • resolve relative → absolute URLs consistently
 *  • attach the Bearer token
 *  • transparently refresh an expired access token (single-flight)
 *  • unwrap the `{ success, data, meta }` envelope and throw typed errors
 *  • offline-first safety: never throw during render, surfaces clear errors
 */

import { API_BASE_URL } from './config';
import { getTokenPair, setTokenPair, clearTokens, getRefreshToken } from './tokens';

export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
  code?: string;
  details?: unknown;
}

async function parseErrorText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function rawFetch(url: string, options: RequestInit): Promise<Response> {
  const headers = new Headers(options.headers ?? {});
  if (!(options.body instanceof FormData)) {
    if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  }
  const token = getTokenPair()?.accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, { ...options, headers });
}

let refreshPromise: Promise<boolean> | null = null;

/** Single-flight token refresh. */
async function refreshTokensOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;
        const json = (await response.json()) as Envelope<{ accessToken: string; refreshToken: string }>;
        setTokenPair({ accessToken: json.data.accessToken, refreshToken: json.data.refreshToken ?? refreshToken });
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  opts: { auth?: boolean; retryOn401?: boolean } = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const { auth = true, retryOn401 = true } = opts;
  const url = path.startsWith('http') ? path : `${API_BASE_URL}/${path.replace(/^\//, '')}`;

  let response = await rawFetch(url, options);

  if (response.status === 401 && auth && retryOn401 && getRefreshToken()) {
    const ok = await refreshTokensOnce();
    if (ok) {
      response = await rawFetch(url, options);
    } else {
      clearTokens();
    }
  }

  if (response.status === 204) return { data: undefined as T };

  let json: Envelope<T> | null = null;
  try {
    json = (await response.json()) as Envelope<T>;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message = json?.error ?? `Request failed (${response.status})`;
    if (json && json.success === false) {
      throw new ApiRequestError(response.status, json.code ?? 'error', message, json.details);
    }
    throw new ApiRequestError(response.status, 'error', message, json?.details);
  }

  if (json && json.success === false) {
    throw new ApiRequestError(response.status, json.code ?? 'error', json.error ?? 'Request failed');
  }

  if (json === null) {
    const text = await parseErrorText(response);
    return { data: (text ? text : undefined) as T };
  }

  return { data: json.data, meta: json.meta };
}

/** GET helper. */
export function apiGet<T>(path: string, opts?: { auth?: boolean }): Promise<{ data: T; meta?: Record<string, unknown> }> {
  return apiFetch<T>(path, { method: 'GET' }, opts);
}

/** POST helper (JSON). */
export function apiPost<T>(path: string, body?: unknown, opts?: { auth?: boolean }): Promise<{ data: T; meta?: Record<string, unknown> }> {
  return apiFetch<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }, opts);
}

/** PUT helper (JSON). */
export function apiPut<T>(path: string, body?: unknown, opts?: { auth?: boolean }): Promise<{ data: T; meta?: Record<string, unknown> }> {
  return apiFetch<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }, opts);
}

/** DELETE helper. */
export function apiDelete<T>(path: string, opts?: { auth?: boolean }): Promise<{ data: T; meta?: Record<string, unknown> }> {
  return apiFetch<T>(path, { method: 'DELETE' }, opts);
}
