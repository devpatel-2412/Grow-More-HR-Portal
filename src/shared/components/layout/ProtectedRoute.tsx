import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { PageLoadingSkeleton } from '../feedback/LoadingSkeleton';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoadingSkeleton />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ redirectTo: location.pathname }} />;
  }

  return <Outlet />;
}
