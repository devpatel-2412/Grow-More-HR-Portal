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
