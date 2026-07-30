import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createTicketSchema,
  changeTicketStatusSchema,
  assignTicketSchema,
  addTicketCommentSchema,
  listTicketsQuerySchema,
  idParamSchema,
} from './ticket.validators.js';
import { createTicket, getTicket, changeTicketStatus, assignTicket, addTicketComment, listTickets } from './ticket.controller.js';

export const ticketRouter = Router();
ticketRouter.use(authenticateAccessToken);

ticketRouter.post('/', validate({ body: createTicketSchema }), asyncHandler(createTicket));
ticketRouter.get('/', validate({ query: listTicketsQuerySchema }), asyncHandler(listTickets));
ticketRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getTicket));
ticketRouter.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: changeTicketStatusSchema }),
  asyncHandler(changeTicketStatus),
);
ticketRouter.patch(
  '/:id/assign',
  requirePermission(PERMISSIONS.TICKET_MANAGE),
  validate({ params: idParamSchema, body: assignTicketSchema }),
  asyncHandler(assignTicket),
);
ticketRouter.post(
  '/:id/comments',
  validate({ params: idParamSchema, body: addTicketCommentSchema }),
  asyncHandler(addTicketComment),
);
