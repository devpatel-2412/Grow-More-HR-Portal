import type { Request, Response } from 'express';
import { ticketService } from './ticket.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { roleHasPermission, PERMISSIONS } from '../../shared/permissions/permissions.js';
import type { z } from 'zod';
import type {
  createTicketSchema,
  changeTicketStatusSchema,
  assignTicketSchema,
  addTicketCommentSchema,
  listTicketsQuerySchema,
} from './ticket.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function canReadTenant(req: Request) {
  return roleHasPermission(req.user!.role, PERMISSIONS.TICKET_READ_TENANT);
}

export async function createTicket(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createTicketSchema>;
  sendCreated(res, await ticketService.create(req.user!.tenantId, req.user!.sub, body, requestMeta(req)));
}

export async function getTicket(req: Request, res: Response): Promise<void> {
  sendOk(res, await ticketService.getTicket(req.user!.tenantId, req.user!.sub, canReadTenant(req), req.params.id));
}

export async function changeTicketStatus(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof changeTicketStatusSchema>;
  const hasTicketManage = roleHasPermission(req.user!.role, PERMISSIONS.TICKET_MANAGE);
  sendOk(
    res,
    await ticketService.changeStatus(req.user!.tenantId, req.user!.sub, hasTicketManage, req.params.id, body.status, requestMeta(req)),
  );
}

export async function assignTicket(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof assignTicketSchema>;
  sendOk(res, await ticketService.assign(req.user!.tenantId, req.params.id, body.assignedToId, requestMeta(req)));
}

export async function addTicketComment(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof addTicketCommentSchema>;
  sendCreated(
    res,
    await ticketService.addComment(req.user!.tenantId, req.user!.sub, canReadTenant(req), req.params.id, body.body, requestMeta(req)),
  );
}

export async function listTickets(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listTicketsQuerySchema>;
  const { rows, meta } = await ticketService.list(req.user!.tenantId, req.user!.sub, canReadTenant(req), query);
  sendPaginated(res, rows, meta);
}
