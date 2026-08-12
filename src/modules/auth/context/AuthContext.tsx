import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { setAccessToken, registerAuthExpiredHandler } from '../../../shared/lib/api-client';
import { broadcastLogout, subscribeToLogout } from '../../../shared/lib/session-broadcast';
import type { AuthUser, EmployeeProfile, Tenant } from '../types/auth.types';

// Removes every cached query except ['auth', 'me']. Plain queryClient.clear() would drop that
// entry too, and since the auth/me observer stays mounted with enabled:true whenever there's no
// session, an empty cache makes it refetch immediately — 401s, triggers a silent refresh, which
// gets rate-limited, re-hits this same handler, and clears again. Infinite me/refresh loop.
function clearNonAuthQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
}

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

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    enabled: !sessionUser, // once login/verify sets the user directly, no need to refetch
  });

  // `isAuthenticated` is derived directly from `sessionUser`/`meQuery.data` in the same render —
  // deliberately NOT a separate state variable synced via its own effect. A synced boolean lags
  // one render behind the query result, and in that gap `isLoading` had already flipped to false
  // while the derived flag was still false, so ProtectedRoute saw "done loading, not authenticated"
  // for one tick on every session restore and bounced an actually-valid session to /login.
  useEffect(() => {
    registerAuthExpiredHandler(() => {
      setAccessToken(null);
      setSessionUser(null);
      clearNonAuthQueries(queryClient);
      queryClient.setQueryData(['auth', 'me'], null);
    });
    // A logout (explicit or inactivity-triggered) in another same-origin tab lands here — clear
    // local state only, don't re-call the server (the tab that acted already did, and the refresh
    // token it revoked is shared across every tab via the one httpOnly cookie).
    return subscribeToLogout(() => {
      setAccessToken(null);
      setSessionUser(null);
      clearNonAuthQueries(queryClient);
      queryClient.setQueryData(['auth', 'me'], null);
    });
  }, [queryClient]);

  function setSession(accessToken: string, user: AuthUser) {
    setAccessToken(accessToken);
    setSessionUser(user);
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setSessionUser(null);
      clearNonAuthQueries(queryClient);
      queryClient.setQueryData(['auth', 'me'], null);
      broadcastLogout();
    }
  }

  const user = sessionUser ?? meQuery.data?.user ?? null;
  const profile = meQuery.data?.profile ?? null;
  const tenant = meQuery.data?.tenant ?? null;
  const isLoading = !sessionUser && meQuery.isLoading;
  const isAuthenticated = !!sessionUser || !!meQuery.data;

  return (
    <AuthContext.Provider value={{ user, profile, tenant, isLoading, isAuthenticated, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
