import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { queryClient } from './shared/lib/query-client';
import { ThemeProvider } from './shared/lib/theme';
import { AuthProvider } from './modules/auth/context/AuthContext';
import { ErrorBoundary } from './shared/components/feedback/ErrorBoundary';
import { router } from './routes/router';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster richColors position="top-right" theme="system" />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
