import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Permission } from '../../../shared/permissions/permission.types';

/**
 * Reads the caller's own effective permission set off the session (see AuthUser.permissions,
 * populated server-side via resolveEffectivePermissions). Purely a UX convenience for hiding
 * controls the backend would 403 on anyway — the route-level check is the real boundary.
 */
export function useHasPermission(permission: Permission): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(permission) ?? false;
}

/**
 * Centralized, reusable access to the current user's effective permission set. Reads once off
 * `AuthContext` (populated once at login/session-restore — see AuthContext.tsx), so every check
 * here is a synchronous Set lookup, not a network call. Every permission-driven UI primitive
 * (`PermissionGate`, `RequirePermission`) is built on top of this single hook.
 */
export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const set = useMemo(() => new Set(permissions), [permissions]);

  return {
    permissions,
    has: (permission: Permission): boolean => set.has(permission),
    hasAny: (perms: Permission[]): boolean => perms.some((p) => set.has(p)),
    hasAll: (perms: Permission[]): boolean => perms.every((p) => set.has(p)),
  };
}
