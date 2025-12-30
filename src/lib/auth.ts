// Authentication service for production-ready auth
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

// Mock authentication service - replace with real API calls
class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful login
    const user: User = {
      id: '1',
      name: 'John Doe',
      email: credentials.email,
      role: 'tenant',
      verified: true,
      createdAt: new Date().toISOString(),
      phone: '(555) 123-4567'
    };

    this.currentUser = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
    return user;
  }

  async register(data: RegisterData): Promise<User> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock successful registration
    const user: User = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      role: data.role,
      verified: false,
      createdAt: new Date().toISOString()
    };

    this.currentUser = user;
    localStorage.setItem('auth_user', JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    this.currentUser = null;
    localStorage.removeItem('auth_user');
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;

    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch {
        localStorage.removeItem('auth_user');
      }
    }

    return null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}

export const authService = AuthService.getInstance();