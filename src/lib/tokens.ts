/**
 * Token storage — a single source of truth shared by the auth service and
 * every API call.
 */

const TOKEN_KEY = 'agently_tokens';
const USER_KEY = 'agently_user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function getTokenPair(): TokenPair | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as TokenPair) : null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return getTokenPair()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return getTokenPair()?.refreshToken ?? null;
}

export function setTokenPair(tokens: TokenPair): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getCachedUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setCachedUser<T>(user: T | null): void {
  if (user === null) localStorage.removeItem(USER_KEY);
  else localStorage.setItem(USER_KEY, JSON.stringify(user));
}
