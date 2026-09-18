import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, User, LoginCredentials, RegisterData, RegisterResult } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  verifyEmail: (token: string) => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (active) setUser(currentUser);
      } catch (error) {
        console.error('Failed to restore auth session:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      try {
        const loggedIn = await authService.login(credentials);
        setUser(loggedIn);
        toast({ title: 'Welcome back!', description: `Successfully signed in as ${loggedIn.name}` });
      } catch (error) {
        toast({
          title: 'Login failed',
          description: error instanceof Error ? error.message : 'Please check your credentials and try again.',
          variant: 'destructive',
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  const register = useCallback(
    async (data: RegisterData): Promise<RegisterResult> => {
      setIsLoading(true);
      try {
        const result = await authService.register(data);
        toast({
          title: 'Account created',
          description: 'Verify your email to activate your account.',
        });
        return result;
      } catch (error) {
        toast({
          title: 'Registration failed',
          description: error instanceof Error ? error.message : 'Please try again or contact support.',
          variant: 'destructive',
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  const verifyEmail = useCallback(
    async (token: string): Promise<User> => {
      try {
        const verified = await authService.verifyEmail(token);
        toast({ title: 'Email verified!', description: 'Your account is now active. Please sign in.' });
        return verified;
      } catch (error) {
        toast({
          title: 'Verification failed',
          description: error instanceof Error ? error.message : 'Invalid or expired token.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [toast],
  );

  const refreshUser = useCallback(async () => {
    const current = await authService.getCurrentUser();
    setUser(current);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    toast({ title: 'Signed out', description: 'You have been successfully signed out.' });
  }, [toast]);

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    register,
    verifyEmail,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
