import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';
import { passwordSchema } from '../auth/auth.validators.js';

export const inviteUserSchema = z
  .object({
    email: z.string().email(),
    role: z.nativeEnum(UserRole),
    clientPortalId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'CLIENT' && !data.clientPortalId) {
      ctx.addIssue({ code: 'custom', message: 'A client portal invite needs clientPortalId', path: ['clientPortalId'] });
    }
    if (data.role !== 'CLIENT' && data.clientPortalId) {
      ctx.addIssue({ code: 'custom', message: 'clientPortalId is only valid for a CLIENT invite', path: ['clientPortalId'] });
    }
  });

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const inviteTokenParamSchema = z.object({
  token: z.string().min(1),
});
