import type { ReactNode } from 'react';
import { usePermissions } from '../../../modules/auth/hooks/useHasPermission';
import type { Permission } from '../../permissions/permission.types';

interface PermissionGateProps {
  /** Render children only if the user holds this single permission. */
  permission?: Permission;
  /** Render children if the user holds at least one of these permissions. */
  anyOf?: Permission[];
  /** Render children only if the user holds every one of these permissions. */
  allOf?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Permission-driven counterpart to `RoleGate` — the default way to hide an action (button, menu
 * item, tab, form entry point...) the current user isn't authorized to use, driven entirely by
 * the effective permission set from the existing RBAC system (never by role name). Never the sole
 * enforcement: the API always re-checks server-side.
 *
 * Exactly one of `permission` / `anyOf` / `allOf` is expected; if none are given, children render
 * unconditionally (useful for a component that's sometimes gated by its caller and sometimes not).
 */
export function PermissionGate({ permission, anyOf, allOf, children, fallback = null }: PermissionGateProps) {
  const { has, hasAny, hasAll } = usePermissions();

  const allowed = permission ? has(permission) : anyOf ? hasAny(anyOf) : allOf ? hasAll(allOf) : true;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
