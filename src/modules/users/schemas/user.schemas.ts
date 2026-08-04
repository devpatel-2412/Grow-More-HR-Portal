import { z } from 'zod';
import { passwordSchema } from '../../auth/schemas/auth.schemas';

export const USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR_MANAGER',
  'PROJECT_MANAGER',
  'EMPLOYEE',
  'CLIENT',
  'RECRUITER',
  'FINANCE',
  'CANDIDATE',
] as const;
// CLIENT is excluded here: it requires a clientPortalId link, which only the "invite portal user"
// flow on a client's own page provides — the generic staff invite/role-change flows never set one.
// CANDIDATE is excluded too: there's no candidate-facing portal yet for an invite to lead to.
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR_MANAGER',
  'PROJECT_MANAGER',
  'EMPLOYEE',
  'RECRUITER',
  'FINANCE',
] as const;
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
});
export type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;
