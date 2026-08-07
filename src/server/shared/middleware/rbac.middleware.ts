import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';
import type { Permission } from '../permissions/permissions.js';
import { resolveEffectivePermissions } from '../permissions/permission-resolver.service.js';
import { asyncHandler } from '../utils/async-handler.js';

/** Coarse guard — use sparingly, for the rare check that is genuinely role-shaped (e.g. only SUPER_ADMIN may create tenants). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}

/**
 * Primary guard every module should use — resolves the caller's static role permissions plus
 * whatever the dynamic RBAC tables additionally grant them (see permission-resolver.service.ts).
 * Async (a cached, short-TTL DB lookup), wrapped in asyncHandler so a rejected lookup still
 * reaches the centralized error middleware instead of hanging the request.
 */
export function requirePermission(permission: Permission) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const effective = await resolveEffectivePermissions(req.user.sub, req.user.tenantId, req.user.role);
    if (!effective.has(permission)) {
      throw new ForbiddenError();
    }
    next();
  });
}

export function requireAnyPermission(...permissions: Permission[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const effective = await resolveEffectivePermissions(req.user.sub, req.user.tenantId, req.user.role);
    if (!permissions.some((p) => effective.has(p))) {
      throw new ForbiddenError();
    }
    next();
  });
}

const EXTERNAL_ROLES: readonly UserRole[] = ['CLIENT', 'CANDIDATE'];

/**
 * Blocks a CLIENT or CANDIDATE login (external, non-staff roles) from internal modules that are
 * otherwise gated on nothing but authentication ("any tenant member can read"). Neither role has
 * an employee profile or any business seeing SOPs, vendors, inventory, org structure, the
 * knowledge base, internal documents, or announcements — those endpoints must use this, not just
 * authenticateAccessToken, whenever they don't already require an EMPLOYEE_* / *_MANAGE permission.
 */
export function requireStaff(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw new UnauthorizedError();
  if (EXTERNAL_ROLES.includes(req.user.role)) throw new ForbiddenError();
  next();
}
