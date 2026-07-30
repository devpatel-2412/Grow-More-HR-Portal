import type { Request, Response } from 'express';
import { projectService } from './project.service.js';
import { milestoneService } from './milestone.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from './project.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createProjectSchema>;
  const project = await projectService.create(req.user!.tenantId, body, requestMeta(req));
  sendCreated(res, project);
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const project = await projectService.getById(req.user!.tenantId, req.params.id);
  sendOk(res, project);
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateProjectSchema>;
  const project = await projectService.update(req.user!.tenantId, req.params.id, body, requestMeta(req));
  sendOk(res, project);
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  await projectService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listProjects(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listProjectsQuerySchema>;
  const { rows, meta } = await projectService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function createMilestone(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createMilestoneSchema>;
  const milestone = await milestoneService.create(req.user!.tenantId, req.params.projectId, body, requestMeta(req));
  sendCreated(res, milestone);
}

export async function listMilestones(req: Request, res: Response): Promise<void> {
  const milestones = await milestoneService.listForProject(req.user!.tenantId, req.params.projectId);
  sendOk(res, milestones);
}

export async function updateMilestone(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateMilestoneSchema>;
  const milestone = await milestoneService.update(req.user!.tenantId, req.params.id, body, requestMeta(req));
  sendOk(res, milestone);
}

export async function deleteMilestone(req: Request, res: Response): Promise<void> {
  await milestoneService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}
