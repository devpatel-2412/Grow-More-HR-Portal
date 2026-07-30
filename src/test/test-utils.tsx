import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../modules/auth/context/AuthContext';
import { ThemeProvider } from '../shared/lib/theme';

export function renderWithProviders(ui: ReactNode, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
