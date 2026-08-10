import { useAuth } from '../context/AuthContext';

/**
 * Reads the caller's own effective permission set off the session (see AuthUser.permissions,
 * populated server-side via resolveEffectivePermissions). Purely a UX convenience for hiding
 * controls the backend would 403 on anyway — the route-level check is the real boundary.
 */
export function useHasPermission(permission: string): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(permission) ?? false;
}
