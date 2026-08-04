import { z } from 'zod';

export const createChecklistItemSchema = z.object({
  label: z.string().min(1).max(200),
});

export const updateChecklistItemSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  isCompleted: z.boolean().optional(),
});

export const employeeIdParamSchema = z.object({ id: z.string().uuid() });
export const checklistItemIdParamSchema = z.object({ itemId: z.string().uuid() });
