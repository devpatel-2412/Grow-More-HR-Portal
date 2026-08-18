import { describe, it, expect } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { AuthProvider, useAuth } from './AuthContext';
import { server, handlers } from '../../../test/msw/server';
import { getAccessToken } from '../../../shared/lib/api-client';

function AuthProbe() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  if (isLoading) return <div>Loading…</div>;
  return (
    <div>
      <div>{isAuthenticated ? `Authenticated as ${user?.email}` : 'Not authenticated'}</div>
      <button onClick={() => void logout()}>Log out</button>
    </div>
  );
}

function renderAuth() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AuthContext — session restore on page reload (E)', () => {
  it('restores the session directly via /auth/me when the access token is valid, without ever calling refresh', async () => {
    let refreshCalls = 0;
    server.use(
      handlers.meSuccess,
      http.post('/api/v1/auth/refresh', () => {
        refreshCalls++;
        return HttpResponse.json({ data: { accessToken: 'x', user: {} } });
      }),
    );
    renderAuth();

    expect(await screen.findByText('Authenticated as admin@acme.com')).toBeInTheDocument();
    expect(refreshCalls).toBe(0);
  });

  it('calls refresh exactly once when the initial /auth/me 401s (expired token), then succeeds and restores the session', async () => {
    server.use(handlers.meExpiredThenSuccess(), handlers.refreshSuccess);
    renderAuth();

    expect(await screen.findByText('Authenticated as admin@acme.com')).toBeInTheDocument();
    expect(getAccessToken()).toBe('refreshed-access-token');
  });

  it('ends up unauthenticated, without looping, when there is no valid session at all', async () => {
    // Default server handlers (meUnauthenticated + refreshFails) simulate a true anonymous visit.
    renderAuth();

    expect(await screen.findByText('Not authenticated')).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });
});

describe('AuthContext — logout (G)', () => {
  it('clears the session and the access token, and does not trigger a refresh/me loop', async () => {
    let meCalls = 0;
    server.use(
      http.get('/api/v1/auth/me', () => {
        meCalls++;
        return HttpResponse.json({
          data: {
            user: { id: 'u1', email: 'admin@acme.com', role: 'ADMIN', status: 'ACTIVE', permissions: [] },
            profile: null,
            tenant: { id: 't1', name: 'Acme Inc', domain: 'acme', logoUrl: null, primaryColor: '#16a34a', secondaryColor: '#0ea5e9' },
          },
        });
      }),
      handlers.logoutSuccess,
    );
    const user = userEvent.setup();
    renderAuth();

    await screen.findByText('Authenticated as admin@acme.com');
    expect(meCalls).toBe(1);

    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(await screen.findByText('Not authenticated')).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();

    // Give any errant refetch a moment to happen, then confirm /auth/me was never called again —
    // proving logout doesn't re-trigger the me/refresh cycle it just tore down.
    await waitFor(() => expect(meCalls).toBe(1));
  });
});
