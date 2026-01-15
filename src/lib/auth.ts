// Authentication service for production-ready auth
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'tenant' | 'landlord' | 'manager' | 'admin';
  avatar?: string;
  phone?: string;
  verified: boolean;
  createdAt: string;
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
  role: 'tenant' | 'landlord' | 'manager';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Real authentication service with API integration
class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private tokens: AuthTokens | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    if (this.tokens?.accessToken) {
      (defaultHeaders as any)['Authorization'] = `Bearer ${this.tokens.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response;
  }

  private async refreshTokens(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
      });

      const data = await response.json();
      this.tokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || this.tokens.refreshToken,
      };
      
      this.saveTokens();
    } catch (error) {
      // Refresh failed, clear tokens
      this.clearTokens();
      throw error;
    }
  }

  private saveTokens(): void {
    if (this.tokens) {
      localStorage.setItem('auth_tokens', JSON.stringify(this.tokens));
    }
  }

  private loadTokens(): void {
    const stored = localStorage.getItem('auth_tokens');
    if (stored) {
      try {
        this.tokens = JSON.parse(stored);
      } catch {
        localStorage.removeItem('auth_tokens');
      }
    }
  }

  private clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem('auth_tokens');
  }

  private saveUser(): void {
    if (this.currentUser) {
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
    }
  }

  private loadUser(): void {
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch {
        localStorage.removeItem('auth_user');
      }
    }
  }

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      
      this.currentUser = data.user;
      this.tokens = data.tokens;
      
      this.saveUser();
      this.saveTokens();
      
      return this.currentUser;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  }

  async register(data: RegisterData): Promise<User> {
    try {
      const response = await this.apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      
      this.currentUser = responseData.user;
      this.tokens = responseData.tokens || null;
      
      this.saveUser();
      if (this.tokens) {
        this.saveTokens();
      }
      
      return this.currentUser;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.tokens?.accessToken) {
        await this.apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
        });
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      this.currentUser = null;
      this.clearTokens();
      localStorage.removeItem('auth_user');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) return this.currentUser;

    // Try to load from storage
    this.loadTokens();
    this.loadUser();

    if (this.currentUser && this.tokens?.accessToken) {
      try {
        // Verify token is still valid by fetching current user
        const response = await this.apiRequest('/auth/me');
        const userData = await response.json();
        
        this.currentUser = userData;
        this.saveUser();
        return this.currentUser;
      } catch (error) {
        // Token might be expired, try to refresh
        try {
          await this.refreshTokens();
          const response = await this.apiRequest('/auth/me');
          const userData = await response.json();
          
          this.currentUser = userData;
          this.saveUser();
          return this.currentUser;
        } catch (refreshError) {
          // Refresh failed, clear everything
          this.clearTokens();
          this.currentUser = null;
          localStorage.removeItem('auth_user');
          return null;
        }
      }
    }

    return this.currentUser;
  }

  getCurrentUserSync(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUserSync() !== null;
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }
}

export const authService = AuthService.getInstance();