import { z } from 'zod';

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, 'Required').max(200),
  description: z.string().max(4000).optional().or(z.literal('')),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string().optional().or(z.literal('')),
  assignedToId: z.string().optional().or(z.literal('')),
});
export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Required').max(2000),
});
export type CreateCommentFormValues = z.infer<typeof createCommentSchema>;

export const createAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Required').max(200),
  fileUrl: z.string().url('Enter a valid URL'),
});
export type CreateAttachmentFormValues = z.infer<typeof createAttachmentSchema>;
