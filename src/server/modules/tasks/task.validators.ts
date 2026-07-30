import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, 'Required').max(200),
  description: z.string().max(4000).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().optional(),
  assignedToId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  loggedHours: z.coerce.number().min(0).optional(),
});

export const listTasksQuerySchema = paginationQuerySchema.extend({
  projectId: z.string().uuid().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedToId: z.string().uuid().optional(),
});

export const taskIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Required').max(2000),
});

export const createAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Required').max(200),
  fileUrl: z.string().url('Enter a valid URL'),
});
