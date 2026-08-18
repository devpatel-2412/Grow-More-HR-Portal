import type { Request, Response } from 'express';
import { userService } from './user.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import { BadRequestError } from '../../shared/errors/app-error.js';
import { resolveAvatarUrl } from '../../shared/utils/avatar-url.util.js';
import type { UploadedFileInput } from '../../shared/storage/storage.service.js';
import type { z } from 'zod';
import type {
  inviteUserSchema,
  acceptInviteSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from './user.validators.js';
import type { PaginationQuery } from '../../shared/utils/pagination.util.js';

function requestContext(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function inviteUser(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof inviteUserSchema>;
  const user = await userService.invite(req.user!.tenantId, body, req.user!.role, requestContext(req));
  sendCreated(res, { id: user.id, email: user.email, role: user.role, status: user.status });
}

export async function getInvitableRoles(req: Request, res: Response): Promise<void> {
  sendOk(res, { roles: userService.invitableRoles(req.user!.role) });
}

export async function listInvites(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as PaginationQuery;
  const { rows, meta } = await userService.listInvites(req.user!.tenantId, query);
  sendPaginated(
    res,
    rows.map((i) => ({ id: i.id, email: i.email, role: i.role, status: i.status, expiresAt: i.expiresAt, createdAt: i.createdAt })),
    meta,
  );
}

export async function resendInvite(req: Request, res: Response): Promise<void> {
  const invite = await userService.resendInvite(req.user!.tenantId, req.params.id, requestContext(req));
  sendOk(res, { id: invite.id, email: invite.email, status: invite.status });
}

export async function revokeInvite(req: Request, res: Response): Promise<void> {
  await userService.revokeInvite(req.user!.tenantId, req.params.id, requestContext(req));
  sendNoContent(res);
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof acceptInviteSchema>;
  const user = await userService.acceptInvite(body);
  sendOk(res, { id: user.id, email: user.email, status: user.status });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listUsersQuerySchema>;
  const { rows, meta } = await userService.list(req.user!.tenantId, query);
  const items = await Promise.all(
    rows.map(async (u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      avatarUrl: await resolveAvatarUrl(u.avatarStorageKey),
      profile: u.profile,
    })),
  );
  sendPaginated(res, items, meta);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await userService.getById(req.user!.tenantId, req.params.id);
  sendOk(res, {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    avatarUrl: await resolveAvatarUrl(user.avatarStorageKey),
  });
}

function toUploadedAvatarFile(file: Express.Multer.File): UploadedFileInput {
  return { buffer: file.buffer, mimeType: file.mimetype, fileName: file.originalname };
}

/** Admin-manages-another-user's-avatar path — gated by USER_STATUS_UPDATE in user.routes.ts (the
 * closest existing "an admin acts on another user's account" permission; ADMIN and SUPER_ADMIN
 * only, matching the product requirement that managers/team leaders get no new capability here). */
export async function uploadUserAvatar(req: Request, res: Response): Promise<void> {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw new BadRequestError('A profile picture file is required');
  const user = await userService.updateAvatar(req.user!.tenantId, req.params.id, toUploadedAvatarFile(file), requestContext(req));
  sendOk(res, { avatarUrl: user.avatarUrl });
}

export async function removeUserAvatar(req: Request, res: Response): Promise<void> {
  await userService.removeAvatar(req.user!.tenantId, req.params.id, requestContext(req));
  sendNoContent(res);
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
