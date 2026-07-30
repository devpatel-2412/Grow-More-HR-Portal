import type { Request, Response } from 'express';
import { userService } from './user.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type {
  inviteUserSchema,
  acceptInviteSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from './user.validators.js';

function requestContext(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function inviteUser(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof inviteUserSchema>;
  const user = await userService.invite(req.user!.tenantId, body, requestContext(req));
  sendCreated(res, { id: user.id, email: user.email, role: user.role, status: user.status });
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof acceptInviteSchema>;
  const user = await userService.acceptInvite(body);
  sendOk(res, { id: user.id, email: user.email, status: user.status });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listUsersQuerySchema>;
  const { rows, meta } = await userService.list(req.user!.tenantId, query);
  sendPaginated(
    res,
    rows.map((u) => ({ id: u.id, email: u.email, role: u.role, status: u.status, lastLoginAt: u.lastLoginAt, profile: u.profile })),
    meta,
  );
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await userService.getById(req.user!.tenantId, req.params.id);
  sendOk(res, { id: user.id, email: user.email, role: user.role, status: user.status, lastLoginAt: user.lastLoginAt });
}

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateUserRoleSchema>;
  const user = await userService.updateRole(req.user!.tenantId, req.params.id, body.role, requestContext(req));
  sendOk(res, { id: user.id, role: user.role });
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateUserStatusSchema>;
  const user = await userService.updateStatus(req.user!.tenantId, req.params.id, body.status, requestContext(req));
  sendOk(res, { id: user.id, status: user.status });
}
