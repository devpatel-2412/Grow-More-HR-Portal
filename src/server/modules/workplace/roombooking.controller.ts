import type { Request, Response } from 'express';
import { roomBookingService } from './roombooking.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { roleHasPermission, PERMISSIONS } from '../../shared/permissions/permissions.js';
import type { z } from 'zod';
import type { createRoomBookingSchema, listRoomBookingsQuerySchema } from './roombooking.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createRoomBooking(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createRoomBookingSchema>;
  sendCreated(res, await roomBookingService.create(req.user!.tenantId, req.user!.sub, body, requestMeta(req)));
}

export async function cancelRoomBooking(req: Request, res: Response): Promise<void> {
  const hasManagePermission = roleHasPermission(req.user!.role, PERMISSIONS.ROOM_BOOKING_MANAGE);
  sendOk(
    res,
    await roomBookingService.cancel(req.user!.tenantId, req.user!.sub, hasManagePermission, req.params.id, requestMeta(req)),
  );
}

export async function listRoomBookings(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listRoomBookingsQuerySchema>;
  const { rows, meta } = await roomBookingService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
