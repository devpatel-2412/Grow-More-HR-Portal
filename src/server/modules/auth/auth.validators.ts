import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export const twoFactorVerifySchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const twoFactorEnableSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().length(6).regex(/^\d{6}$/),
});

export const loginHistoryQuerySchema = paginationQuerySchema;
