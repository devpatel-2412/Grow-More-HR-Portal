import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { queryClient } from './shared/lib/query-client';
import { ThemeProvider } from './shared/lib/theme';
import { AuthProvider } from './modules/auth/context/AuthContext';
import { SessionManager } from './modules/auth/components/SessionManager';
import { ErrorBoundary } from './shared/components/feedback/ErrorBoundary';
import { Preloader } from './shared/components/feedback/Preloader';
import { router } from './routes/router';

export default function App() {
  return (
    <>
      <Preloader />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <RouterProvider router={router} />
              <SessionManager />
              <Toaster richColors position="top-right" theme="system" />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </>
  );
}
