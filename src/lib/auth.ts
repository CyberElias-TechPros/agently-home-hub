// Authentication service — talks to the real Agently API via `authApi`.
// Tokens are persisted in localStorage; refresh is handled transparently.

const USER_KEY = 'auth_user';
const TOKENS_KEY = 'auth_tokens';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'tenant' | 'landlord' | 'agent' | 'manager' | 'admin';
  avatar?: string | null;
  phone?: string | null;
  verified: boolean;
  createdAt?: string;
  profile?: { bio?: string | null; company?: string | null; occupation?: string | null; trustScore?: number; verifiedStatus?: string };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'tenant' | 'landlord' | 'agent' | 'manager';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

const ROLE_LABELS: Record<string, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  agent: 'Agent',
  manager: 'Manager',
  admin: 'Admin',
};

export function roleLabel(role?: string | null): string {
  return ROLE_LABELS[role || ''] || (role || '');
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<string> | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const tokens = localStorage.getItem(TOKENS_KEY);
      if (tokens) this.tokens = JSON.parse(tokens);
      const user = localStorage.getItem(USER_KEY);
      if (user) this.currentUser = JSON.parse(user);
    } catch {
      /* ignore malformed storage */
    }
  }

  private saveTokens(): void {
    if (this.tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(this.tokens));
    else localStorage.removeItem(TOKENS_KEY);
  }

  private saveUser(): void {
    if (this.currentUser) localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
    else localStorage.removeItem(USER_KEY);
  }

  private clearAll(): void {
    this.tokens = null;
    this.currentUser = null;
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getAccessToken(): string | null {
    if (!this.tokens) this.loadFromStorage();
    return this.tokens?.accessToken || null;
  }

  getRefreshToken(): string | null {
    if (!this.tokens) this.loadFromStorage();
    return this.tokens?.refreshToken || null;
  }

  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;
    const refreshToken = this.getRefreshToken();
    this.refreshPromise = (async () => {
      if (!refreshToken) throw new Error('No refresh token');
      const { authApi } = await import('./api');
      const { accessToken } = await authApi.refresh(refreshToken);
      if (this.tokens) {
        this.tokens.accessToken = accessToken;
        this.saveTokens();
      }
      return accessToken;
    })()
      .finally(() => {
        this.refreshPromise = null;
      });
    return this.refreshPromise;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    const { authApi } = await import('./api');
    const data = await authApi.login(credentials);
    this.currentUser = data.user;
    this.tokens = data.tokens;
    this.saveUser();
    this.saveTokens();
    return this.currentUser;
  }

  async register(data: RegisterData): Promise<User> {
    const { authApi } = await import('./api');
    const res = await authApi.register(data);
    this.currentUser = res.user;
    this.tokens = res.tokens || null;
    this.saveUser();
    this.saveTokens();
    return this.currentUser;
  }

  async logout(): Promise<void> {
    const { authApi } = await import('./api');
    try {
      if (this.getRefreshToken()) await authApi.logout(this.getRefreshToken() || undefined);
    } catch {
      /* local sign-out proceeds regardless */
    } finally {
      this.clearAll();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser && this.tokens?.accessToken) return this.currentUser;
    if (!this.tokens?.accessToken) return null;

    const { authApi } = await import('./api');
    try {
      const data = await authApi.me();
      this.currentUser = data.user;
      this.saveUser();
      return this.currentUser;
    } catch (err: any) {
      // Token may have expired — try refresh once.
      if (err?.status === 401 || err?.status === 403) {
        try {
          await this.refreshAccessToken();
          const data = await authApi.me();
          this.currentUser = data.user;
          this.saveUser();
          return this.currentUser;
        } catch {
          this.clearAll();
          return null;
        }
      }
      return this.currentUser;
    }
  }

  getCurrentUserSync(): User | null {
    if (!this.currentUser) this.loadFromStorage();
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUserSync() !== null;
  }
}

export const authService = AuthService.getInstance();
