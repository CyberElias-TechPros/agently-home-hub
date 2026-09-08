import type { ApiErrorBody, AuthTokens } from './types';

/**
 * Single HTTP entry point for the whole frontend.
 *
 * Responsibilities:
 *  - resolve the API base URL from the environment (never hardcoded)
 *  - attach and refresh bearer tokens
 *  - normalise every failure into an `ApiError`
 *  - abort requests that hang, so the UI never spins forever
 *  - emit a global `agently:unauthorized` event so the auth layer can react
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? '/api'
).replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiErrorCode =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'validation'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(args: {
    code: ApiErrorCode;
    message: string;
    status?: number;
    requestId?: string;
    details?: unknown;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.code = args.code;
    this.status = args.status ?? 0;
    this.requestId = args.requestId;
    this.details = args.details;
  }

  /** True when retrying the identical request could plausibly succeed. */
  get isRetryable(): boolean {
    return this.code === 'network' || this.code === 'timeout' || this.code === 'server';
  }

  get isAuthError(): boolean {
    return this.code === 'unauthorized';
  }
}

const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation',
  429: 'rate_limited',
};

/* ------------------------------------------------------------------ */
/* Token storage                                                       */
/* ------------------------------------------------------------------ */

const TOKEN_STORAGE_KEY = 'agently.auth.tokens';

type TokenListener = (tokens: AuthTokens | null) => void;

const tokenListeners = new Set<TokenListener>();

let memoryTokens: AuthTokens | null = readStoredTokens();

function readStoredTokens(): AuthTokens | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthTokens;
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    return parsed;
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

export function getTokens(): AuthTokens | null {
  return memoryTokens;
}

export function setTokens(tokens: AuthTokens | null): void {
  memoryTokens = tokens;
  if (typeof localStorage !== 'undefined') {
    if (tokens) {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
  tokenListeners.forEach((listener) => listener(tokens));
}

export function onTokensChanged(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

/** True when the access token is already expired or expires within the skew. */
export function isAccessTokenExpired(skewSeconds = 30): boolean {
  if (!memoryTokens) return true;
  const expiresAt = Date.parse(memoryTokens.expires_at);
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt - skewSeconds * 1000 <= Date.now();
}

export function getAccessToken(): string | null {
  return memoryTokens?.access_token ?? null;
}

/* ------------------------------------------------------------------ */
/* Refresh coordination                                                */
/* ------------------------------------------------------------------ */

let refreshPromise: Promise<AuthTokens | null> | null = null;

/**
 * Pulls a token pair out of a refresh response.
 *
 * The API answers with a `{ data: { tokens } }` envelope; older builds returned
 * the pair at the top level. Both are accepted, and anything else is rejected
 * rather than coerced, so a malformed response signs the user out instead of
 * storing a broken token.
 */
function extractTokens(payload: unknown): AuthTokens | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = 'data' in payload ? (payload as { data?: unknown }).data : payload;
  const tokens = (candidate as { tokens?: unknown } | null)?.tokens;
  if (!tokens || typeof tokens !== 'object') return null;
  const { access_token, refresh_token, expires_at } = tokens as Record<string, unknown>;
  if (typeof access_token !== 'string' || typeof refresh_token !== 'string' || typeof expires_at !== 'string') {
    return null;
  }
  return { access_token, refresh_token, expires_at };
}

/** Exchanged once even when many requests fail with 401 at the same time. */
async function refreshTokens(): Promise<AuthTokens | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const current = getTokens();
    if (!current?.refresh_token) {
      setTokens(null);
      return null;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      if (!response.ok) {
        setTokens(null);
        return null;
      }
      // The API wraps payloads in a `{ data }` envelope; accept either shape so
      // a change on one side cannot silently break sign-in.
      const payload = (await response.json()) as unknown;
      const tokens = extractTokens(payload);
      if (!tokens?.access_token) {
        setTokens(null);
        return null;
      }
      setTokens(tokens);
      return tokens;
    } catch {
      setTokens(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/* ------------------------------------------------------------------ */
/* Request plumbing                                                    */
/* ------------------------------------------------------------------ */

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | Array<string | number> | null | undefined>;
  timeoutMs?: number;
  /** Set to false for the auth endpoints themselves. */
  authenticated?: boolean;
  signal?: AbortSignal;
}

export function buildQueryString(
  query?: RequestOptions['query']
): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, String(entry)));
    } else {
      params.append(key, String(value));
    }
  }
  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
}

function parseErrorBody(body: string | null): ApiErrorBody | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as ApiErrorBody;
    return parsed?.error ? parsed : null;
  } catch {
    return null;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  // Response bodies can only be read once — buffer as text first.
  const text = await response.clone().text().catch(() => null);
  const body = parseErrorBody(text);
  const code = CODE_BY_STATUS[response.status] ?? (response.status >= 500 ? 'server' : 'unknown');
  return new ApiError({
    code,
    status: response.status,
    message: body?.error.message ?? defaultMessageFor(code, response.status),
    requestId: body?.error.request_id ?? response.headers.get('x-request-id') ?? undefined,
    details: body?.error.details,
  });
}

function defaultMessageFor(code: ApiErrorCode, status: number): string {
  switch (code) {
    case 'unauthorized':
      return 'Your session has expired. Please sign in again.';
    case 'forbidden':
      return 'You do not have permission to perform this action.';
    case 'not_found':
      return 'The requested resource could not be found.';
    case 'conflict':
      return 'That change conflicts with the current state of the record.';
    case 'rate_limited':
      return 'Too many requests. Please slow down and try again shortly.';
    case 'validation':
      return 'Some of the information provided is not valid.';
    case 'server':
      return 'The server encountered an unexpected problem. Please try again.';
    default:
      return `Request failed with status ${status}.`;
  }
}

async function send(
  url: string,
  options: RequestOptions,
  tokens: AuthTokens | null,
  authenticated: boolean
): Promise<Response> {
  const { method = 'GET', body, query, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  if (authenticated && tokens?.access_token) {
    finalHeaders.set('Authorization', `Bearer ${tokens.access_token}`);
  }
  finalHeaders.set('Accept', 'application/json');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = options.signal;
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

  try {
    return await fetch(`${API_BASE_URL}${url}${buildQueryString(query)}`, {
      ...rest,
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const authenticated = options.authenticated ?? true;

  let tokens = authenticated ? getTokens() : null;
  if (authenticated && isAccessTokenExpired() && tokens?.refresh_token) {
    tokens = await refreshTokens();
  }

  let response: Response;
  try {
    response = await send(url, options, tokens, authenticated);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (options.signal?.aborted) {
        throw new ApiError({ code: 'aborted', message: 'Request cancelled.' });
      }
      throw new ApiError({ code: 'timeout', message: 'The request took too long. Please try again.' });
    }
    throw new ApiError({
      code: 'network',
      message: 'Unable to reach the server. Check your connection and try again.',
    });
  }

  // One silent retry after a successful token refresh.
  if (response.status === 401 && authenticated) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      try {
        response = await send(url, options, refreshed, authenticated);
      } catch {
        throw new ApiError({
          code: 'network',
          message: 'Unable to reach the server. Check your connection and try again.',
        });
      }
    }
  }

  if (!response.ok) {
    const apiError = await toApiError(response);
    if (apiError.code === 'unauthorized') {
      setTokens(null);
      window.dispatchEvent(new CustomEvent('agently:unauthorized', { detail: apiError }));
    }
    throw apiError;
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return (await response.text()) as unknown as T;
  }
  return (await response.json()) as T;
}

/** Convenience helpers keep call sites terse without hiding the error model. */
export const http = {
  get: <T>(url: string, options?: RequestOptions) => apiRequest<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'POST', body }),
  put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'PUT', body }),
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'PATCH', body }),
  delete: <T>(url: string, options?: RequestOptions) => apiRequest<T>(url, { ...options, method: 'DELETE' }),
};
