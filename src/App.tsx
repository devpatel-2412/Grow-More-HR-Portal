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
    // ErrorBoundary now wraps Preloader too — React error boundaries only catch errors thrown by
    // their *descendants*. Preloader used to render as ErrorBoundary's sibling, so an uncaught
    // exception anywhere in it (render, or its layout/mount effects) had no boundary above it at
    // all and would unmount the entire app to a blank white screen instead of the intended 500
    // fallback. Same rendering order and timing as before — only the error-containment changed.
    <ErrorBoundary>
      <Preloader />
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
  );
}
