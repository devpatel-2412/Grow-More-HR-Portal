import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { setAccessToken, registerAuthExpiredHandler } from '../../../shared/lib/api-client';
import type { AuthUser, EmployeeProfile, Tenant } from '../types/auth.types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: EmployeeProfile | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [hasSession, setHasSession] = useState(false);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    enabled: !sessionUser, // once login/verify sets the user directly, no need to refetch
  });

  useEffect(() => {
    registerAuthExpiredHandler(() => {
      setSessionUser(null);
      setHasSession(false);
      queryClient.setQueryData(['auth', 'me'], null);
    });
  }, [queryClient]);

  useEffect(() => {
    if (meQuery.data) setHasSession(true);
    if (meQuery.isError) setHasSession(false);
  }, [meQuery.data, meQuery.isError]);

  function setSession(accessToken: string, user: AuthUser) {
    setAccessToken(accessToken);
    setSessionUser(user);
    setHasSession(true);
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setSessionUser(null);
      setHasSession(false);
      queryClient.clear();
    }
  }

  const user = sessionUser ?? meQuery.data?.user ?? null;
  const profile = meQuery.data?.profile ?? null;
  const tenant = meQuery.data?.tenant ?? null;
  const isLoading = !sessionUser && meQuery.isLoading;

  return (
    <AuthContext.Provider
      value={{ user, profile, tenant, isLoading, isAuthenticated: hasSession && !!user, setSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
