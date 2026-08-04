import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';
import { roleHasPermission, type Permission } from '../permissions/permissions.js';

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

/** Primary guard every module should use — resolves the caller's role to a permission set with no DB hit. */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (!roleHasPermission(req.user.role, permission)) {
      throw new ForbiddenError();
    }
    next();
  };
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
