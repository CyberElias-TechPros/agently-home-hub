/**
 * Authentication service — talks to the Cloudflare Worker `/auth` endpoints.
 *
 * Flow (happy path):
 *   register → returns user + `/verify?token=…` link
 *   verify   → activates the account
 *   login    → returns user + access/refresh tokens (stored)
 *   me       → token-protected profile fetch
 *   refresh  → transparently handled by the HTTP client
 */

import { API_BASE_URL } from './config';
import { getTokenPair, setTokenPair, clearTokens, getCachedUser, setCachedUser } from './tokens';

export type UserRole = 'tenant' | 'landlord' | 'agent' | 'manager' | 'admin' | 'vendor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  verified: boolean;
  trustScore?: number;
  kycStatus?: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterResult {
  user: User;
  verifyUrl?: string;
  sentTo?: string;
}

/** register() returns the user plus (in demo mode) the verification link. */
export type RegisteredUser = User & { verifyUrl?: string; sentTo?: string };

function toUser(raw: any): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    avatar: raw.avatar ?? null,
    phone: raw.phone ?? null,
    verified: raw.verified === true || raw.verified === 1,
    trustScore: raw.trustScore ?? raw.trust_score ?? 50,
    kycStatus: raw.kycStatus ?? raw.kyc_status ?? 'not_started',
    createdAt: raw.createdAt ?? raw.created_at,
  };
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers ?? {});
  if (options.body) headers.set('Content-Type', 'application/json');

  const tokens = getTokenPair();
  if (tokens?.accessToken) headers.set('Authorization', `Bearer ${tokens.accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message = json?.error ?? `Request failed (${response.status})`;
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = json?.code;
    err.status = response.status;
    throw err;
  }

  return json?.data ?? json;
}

export const authService = {
  async register(data: RegisterData): Promise<RegisterResult> {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      user: toUser(res.user),
      verifyUrl: res.verifyEmail?.verifyUrl,
      sentTo: res.verifyEmail?.sentTo,
    };
  },

  async verifyEmail(token: string): Promise<User> {
    const res = await request(`/auth/verify?token=${encodeURIComponent(token)}`);
    return toUser(res.user);
  },

  async login(credentials: LoginCredentials): Promise<User> {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.tokens) {
      setTokenPair({
        accessToken: res.tokens.accessToken,
        refreshToken: res.tokens.refreshToken,
      });
    }
    const user = toUser(res.user);
    setCachedUser(user);
    return user;
  },

  async refresh(): Promise<boolean> {
    try {
      const res = await request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: getTokenPair()?.refreshToken }),
      });
      const current = getTokenPair();
      if (res.accessToken) {
        setTokenPair({ accessToken: res.accessToken, refreshToken: res.refreshToken ?? current?.refreshToken ?? '' });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // swallow — tokens cleared below regardless
    } finally {
      clearTokens();
      setCachedUser(null);
    }
  },

  async me(): Promise<User | null> {
    try {
      return toUser(await request('/auth/me'));
    } catch {
      return null;
    }
  },

  async updateProfile(patch: { name?: string; phone?: string; avatar?: string }): Promise<User> {
    return toUser(await request('/auth/profile', { method: 'PUT', body: JSON.stringify(patch) }));
  },

  async forgotPassword(email: string): Promise<{ resetToken?: string; resetUrl?: string }> {
    return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
  },

  async getCurrentUser(): Promise<User | null> {
    const cached = getCachedUser<User>();
    const tokens = getTokenPair();
    if (!tokens?.accessToken) return null;

    // Verify with the backend (also triggers refresh if stale).
    const fresh = await this.me();
    if (fresh) {
      setCachedUser(fresh);
      return fresh;
    }
    return cached ?? null;
  },

  isAuthenticated(): boolean {
    return Boolean(getTokenPair()?.accessToken);
  },
};
