import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { usePermissions } from '../../../modules/auth/hooks/useHasPermission';
import type { Permission } from '../../permissions/permission.types';
import { ForbiddenPage } from '../feedback/ForbiddenPage';

interface RequirePermissionProps {
  permission?: Permission;
  anyOf?: Permission[];
  allOf?: Permission[];
  /** If provided, rendered directly on success instead of `<Outlet/>` — lets this double as a
   * leaf-route wrapper, not just a nested-route group layout. */
  children?: ReactNode;
}

/**
 * Route-level counterpart to `PermissionGate` (and the permission-driven twin of `RequireRole`) —
 * enforces the same policy against direct URL navigation, not just hidden nav links. Denies with
 * the existing `ForbiddenPage`, never a silent redirect, so a user who loses a permission mid-
 * session gets a clear reason if they still have the URL.
 */
export function RequirePermission({ permission, anyOf, allOf, children }: RequirePermissionProps) {
  const { has, hasAny, hasAll } = usePermissions();

  const allowed = permission ? has(permission) : anyOf ? hasAny(anyOf) : allOf ? hasAll(allOf) : true;

  if (!allowed) return <ForbiddenPage />;
  return children ? <>{children}</> : <Outlet />;
}
