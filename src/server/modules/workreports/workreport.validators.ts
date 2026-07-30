import { z } from 'zod';
import { WorkReportStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

const taskLineList = z.array(z.string().min(1).max(500)).max(50);

export const submitWorkReportSchema = z.object({
  date: z.coerce.date(),
  completedTasks: taskLineList,
  pendingTasks: taskLineList.default([]),
  tomorrowPlan: taskLineList.default([]),
  issues: z.string().max(2000).optional(),
  timeSpentMinutes: z.number().int().min(0).max(1440),
});

export const updateWorkReportSchema = z.object({
  completedTasks: taskLineList.optional(),
  pendingTasks: taskLineList.optional(),
  tomorrowPlan: taskLineList.optional(),
  issues: z.string().max(2000).nullable().optional(),
  timeSpentMinutes: z.number().int().min(0).max(1440).optional(),
});

export const reviewWorkReportSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(1000).optional(),
});

export const listWorkReportQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
  status: z.nativeEnum(WorkReportStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const workReportIdParamSchema = z.object({
  id: z.string().uuid(),
});
