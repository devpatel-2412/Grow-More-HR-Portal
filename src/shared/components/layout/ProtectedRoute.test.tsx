import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../../../modules/auth/context/AuthContext';

function renderProtected() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Secret Dashboard</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when the session cannot be restored', async () => {
    renderProtected();

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
  });
});
