import { z } from 'zod';

// Mirrors src/server/modules/auth/auth.validators.ts. Kept as a deliberate duplicate rather
// than a cross-tsconfig shared import (client uses "bundler" resolution, server uses
// "NodeNext" — sharing one file cleanly would need path-alias wiring in both tsconfigs that
// hasn't been verified yet). Keep these two files in sync when password rules change.
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  tenantName: z.string().min(2, 'Organization name is too short').max(120),
  tenantDomain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  email: z.string().email('Enter a valid email address'),
  password: passwordSchema,
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
});
export type SignupFormValues = z.infer<typeof signupSchema>;

export const twoFactorVerifySchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().length(6, 'Enter the 6-digit code'),
});
export type TwoFactorVerifyFormValues = z.infer<typeof twoFactorVerifySchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});
export type PasswordResetRequestFormValues = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type PasswordResetConfirmFormValues = z.infer<typeof passwordResetConfirmSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
