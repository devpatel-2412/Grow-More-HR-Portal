import { z } from 'zod';

export const emailTemplateTypeSchema = z.object({
  type: z.enum(['invite', 'password_reset', 'welcome', 'interview_scheduled', 'notification']),
});

export const sendTestEmailSchema = z.object({
  to: z.string().email(),
  type: z.enum(['invite', 'password_reset', 'welcome', 'interview_scheduled', 'notification']).default('notification'),
});

export const listEmailLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['SENT', 'FAILED']).optional(),
});
