import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';

/**
 * Asserts the authenticated user's tenantId matches a tenantId resolved from the request
 * (route param, loaded resource, etc). SUPER_ADMIN bypasses tenant scoping by design —
 * every other role is hard-blocked from cross-tenant reads even with a technically valid token.
 */
export function assertSameTenant(userTenantId: string, resourceTenantId: string, userRole: string): void {
  if (userRole === 'SUPER_ADMIN') return;
  if (userTenantId !== resourceTenantId) {
    throw new ForbiddenError('Resource does not belong to your tenant');
  }
}

/** Route-level middleware variant for endpoints where the tenant id is the caller's own tenant by construction. */
export function requireTenantContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new UnauthorizedError();
  if (!req.user.tenantId) throw new ForbiddenError('No tenant context on this account');
  next();
}
