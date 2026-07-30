import { z } from 'zod';
import { passwordSchema } from '../../auth/schemas/auth.schemas';

export const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'CLIENT'] as const;
export const USER_STATUSES = ['PENDING_INVITE', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

export const inviteUserSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(USER_ROLES),
});
export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
  firstName: z.string().min(1, 'Required').max(80),
  lastName: z.string().min(1, 'Required').max(80),
});
export type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;
