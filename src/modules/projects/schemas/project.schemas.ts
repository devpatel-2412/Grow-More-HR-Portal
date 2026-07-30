import { z } from 'zod';

export const PROJECT_STATUSES = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Required').max(160),
  description: z.string().max(2000).optional().or(z.literal('')),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().optional().or(z.literal('')),
});
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export const createMilestoneSchema = z.object({
  name: z.string().min(1, 'Required').max(160),
  dueDate: z.string().min(1, 'Required'),
});
export type CreateMilestoneFormValues = z.infer<typeof createMilestoneSchema>;
