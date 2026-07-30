import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { registerVisitorSchema, listVisitorsQuerySchema, idParamSchema } from './visitor.validators.js';
import { registerVisitor, getVisitor, checkInVisitor, checkOutVisitor, listVisitors } from './visitor.controller.js';

const manage = requirePermission(PERMISSIONS.VISITOR_MANAGE);

export const visitorRouter = Router();
visitorRouter.use(authenticateAccessToken);
visitorRouter.use(manage); // front-desk/reception function — not something every employee needs

visitorRouter.post('/', validate({ body: registerVisitorSchema }), asyncHandler(registerVisitor));
visitorRouter.get('/', validate({ query: listVisitorsQuerySchema }), asyncHandler(listVisitors));
visitorRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getVisitor));
visitorRouter.post('/:id/check-in', validate({ params: idParamSchema }), asyncHandler(checkInVisitor));
visitorRouter.post('/:id/check-out', validate({ params: idParamSchema }), asyncHandler(checkOutVisitor));
