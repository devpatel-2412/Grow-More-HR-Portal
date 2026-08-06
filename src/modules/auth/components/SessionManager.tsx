import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useIdleTimer } from '../hooks/useIdleTimer';
import { SessionWarningDialog } from './SessionWarningDialog';

// Mirrors the backend Tenant defaults (sessionTimeoutMinutes @default(60), sessionWarningMinutes
// @default(2)) — used only until tenant data has loaded for the current session (e.g. the first
// render right after a fresh login, before the /me tenant fetch resolves).
const DEFAULT_TIMEOUT_MINUTES = 60;
const DEFAULT_WARNING_MINUTES = 2;

/** Mounted once, app-wide, alongside the router — enforces the configured inactivity timeout and
 * shows the "session about to expire" warning. No-ops entirely when not authenticated. */
export function SessionManager() {
  const { isAuthenticated, tenant, logout } = useAuth();

  const handleTimeout = useCallback(() => {
    void logout();
    toast.info('You were signed out due to inactivity.');
  }, [logout]);

  const { isWarning, secondsRemaining, reset } = useIdleTimer({
    enabled: isAuthenticated,
    timeoutMinutes: tenant ? tenant.sessionTimeoutMinutes : DEFAULT_TIMEOUT_MINUTES,
    warningMinutes: tenant?.sessionWarningMinutes ?? DEFAULT_WARNING_MINUTES,
    onTimeout: handleTimeout,
  });

  if (!isAuthenticated) return null;

  return (
    <SessionWarningDialog
      open={isWarning}
      secondsRemaining={secondsRemaining}
      onContinue={reset}
      onLogoutNow={() => void logout()}
    />
  );
}
