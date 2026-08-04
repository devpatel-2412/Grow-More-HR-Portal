import { z } from 'zod';
import { ProjectStatus, MilestoneStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Required').max(160),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  clientPortalId: z.string().uuid().nullable().optional(),
});

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createMilestoneSchema = z.object({
  name: z.string().min(1, 'Required').max(160),
  dueDate: z.coerce.date(),
});

export const updateMilestoneSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.nativeEnum(MilestoneStatus).optional(),
});

export const milestoneIdParamSchema = z.object({
  id: z.string().uuid(),
});
