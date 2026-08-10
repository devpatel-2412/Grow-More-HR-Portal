import { z } from 'zod';
import { passwordSchema } from '../../auth/schemas/auth.schemas';

// Exactly 6 fixed roles — no custom roles, nothing else invitable.
export const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] as const;
export const STAFF_ROLES = USER_ROLES;
export const USER_STATUSES = ['PENDING_INVITE', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

export const inviteUserSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(STAFF_ROLES),
});
export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
  firstName: z.string().min(1, 'Required').max(80),
  lastName: z.string().min(1, 'Required').max(80),
  acceptedTerms: z.literal(true, 'You must accept the company policy to activate your account'),
});
export type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;
