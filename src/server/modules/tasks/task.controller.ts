import type { Request, Response } from 'express';
import { taskService } from './task.service.js';
import { commentService } from './comment.service.js';
import { attachmentService } from './attachment.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import { roleHasPermission, PERMISSIONS } from '../../shared/permissions/permissions.js';
import type { z } from 'zod';
import type {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  createCommentSchema,
  createAttachmentSchema,
} from './task.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createTaskSchema>;
  const task = await taskService.create(req.user!.tenantId, body, requestMeta(req));
  sendCreated(res, task);
}

export async function getTask(req: Request, res: Response): Promise<void> {
  const task = await taskService.getById(req.user!.tenantId, req.params.id);
  sendOk(res, task);
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateTaskSchema>;
  const hasTaskManage = roleHasPermission(req.user!.role, PERMISSIONS.TASK_MANAGE);
  const task = await taskService.update(req.user!.tenantId, req.user!.sub, hasTaskManage, req.params.id, body, requestMeta(req));
  sendOk(res, task);
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  await taskService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listTasks(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listTasksQuerySchema>;
  const { rows, meta } = await taskService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function addComment(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createCommentSchema>;
  const comment = await commentService.add(req.user!.tenantId, req.user!.sub, req.params.id, body);
  sendCreated(res, comment);
}

export async function listComments(req: Request, res: Response): Promise<void> {
  const comments = await commentService.listForTask(req.user!.tenantId, req.params.id);
  sendOk(res, comments);
}

export async function addAttachment(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createAttachmentSchema>;
  const attachment = await attachmentService.add(req.user!.tenantId, req.user!.sub, req.params.id, body);
  sendCreated(res, attachment);
}

export async function listAttachments(req: Request, res: Response): Promise<void> {
  const attachments = await attachmentService.listForTask(req.user!.tenantId, req.params.id);
  sendOk(res, attachments);
}
