import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, authApi, getTokens, onTokensChanged, setTokens } from '@/lib/api';
import type { User, UserRole } from '@/lib/api/types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; role: 'tenant' | 'landlord' | 'agent' }) => Promise<void>;
  logout: (everywhere?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Application-wide authentication state.
 *
 * Three things this deliberately gets right that the previous implementation
 * did not:
 *
 *  1. Token storage lives in the API client, not here, so the HTTP layer and
 *     the React layer can never disagree about whether we are signed in.
 *  2. A 401 anywhere in the app signs the user out once, centrally, instead of
 *     leaving a signed-in UI talking to a rejected API.
 *  3. Restoring the session is race-free: an unmounted provider no longer
 *     writes state, and concurrent refreshes are de-duplicated by the client.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clear = useCallback(() => {
    setTokens(null);
    setUser(null);
  }, []);

  // Restore an existing session exactly once on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!getTokens()) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const response = await authApi.me();
        if (!cancelled) setUser(response.data.user);
      } catch (error) {
        // An expired refresh token is the normal case here; the client has
        // already cleared the stored tokens, so just drop the session.
        if (!(error instanceof ApiError)) {
          console.error('Failed to restore session', error);
        }
        if (!cancelled) clear();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clear]);

  // Any request that fails with a 401 clears the tokens; mirror that here so the
  // UI immediately reflects being signed out.
  useEffect(() => onTokensChanged((tokens) => {
    if (!tokens) setUser(null);
  }), []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('agently:unauthorized', onUnauthorized);
    return () => window.removeEventListener('agently:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authApi.login({ email, password }).then((r) => r.data);
    setTokens(session.tokens);
    setUser(session.user);
  }, []);

  const register = useCallback<AuthContextValue['register']>(async (input) => {
    const session = await authApi.register(input).then((r) => r.data);
    setTokens(session.tokens);
    setUser(session.user);
  }, []);

  const logout = useCallback(async (everywhere = false) => {
    try {
      await authApi.logout(everywhere ? getTokens()?.refresh_token ?? null : null);
    } catch {
      // Signing out locally must always succeed, even if the API is unreachable.
    } finally {
      clear();
    }
  }, [clear]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.user);
    } catch {
      clear();
    }
  }, [clear]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      hasRole,
    }),
    [user, isLoading, login, register, logout, refreshUser, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
