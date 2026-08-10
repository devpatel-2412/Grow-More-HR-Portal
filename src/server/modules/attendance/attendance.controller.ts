import type { Request, Response } from 'express';
import { attendanceService } from './attendance.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { resolveEffectivePermissions } from '../../shared/permissions/permission-resolver.service.js';
import type { z } from 'zod';
import type { punchInSchema, listAttendanceQuerySchema } from './attendance.validators.js';

export async function punchIn(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof punchInSchema>;
  const attendance = await attendanceService.punchIn(req.user!.sub, req.user!.tenantId, body, { ipAddress: req.ip });
  sendCreated(res, attendance);
}

export async function punchOut(req: Request, res: Response): Promise<void> {
  const attendance = await attendanceService.punchOut(req.user!.sub, req.user!.tenantId);
  sendOk(res, attendance);
}

export async function startBreak(req: Request, res: Response): Promise<void> {
  const attendance = await attendanceService.startBreak(req.user!.sub);
  sendOk(res, attendance);
}

export async function endBreak(req: Request, res: Response): Promise<void> {
  const attendance = await attendanceService.endBreak(req.user!.sub, req.user!.tenantId);
  sendOk(res, attendance);
}

export async function getToday(req: Request, res: Response): Promise<void> {
  const attendance = await attendanceService.getToday(req.user!.sub, req.user!.tenantId);
  sendOk(res, attendance);
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const attendance = await attendanceService.getById(req.user!.tenantId, req.params.id);
  sendOk(res, attendance);
}

export async function listAttendance(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listAttendanceQuerySchema>;
  const effective = await resolveEffectivePermissions(req.user!.sub, req.user!.tenantId, req.user!.role);
  const canReadTenant = effective.has(PERMISSIONS.ATTENDANCE_READ_TENANT);
  // employee scoped list queries naturally filter based on canReadTenant and userId inside the service
  const { rows, meta } = await attendanceService.list(req.user!.tenantId, { userId: req.user!.sub, tenantId: req.user!.tenantId, canReadTenant }, query);
  sendPaginated(res, rows, meta);
}
