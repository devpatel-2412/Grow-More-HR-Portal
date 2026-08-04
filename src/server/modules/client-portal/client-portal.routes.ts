import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { idParamSchema } from '../finance/finance.validators.js';
import { listOwnFinanceDocumentsQuerySchema, listOwnProjectsQuerySchema } from './client-portal.validators.js';
import { getOwnProfile, listOwnFinanceDocuments, getOwnFinanceDocument, listOwnProjects } from './client-portal.controller.js';

export const clientPortalRouter = Router();
clientPortalRouter.use(authenticateAccessToken);

// No permission gate — every route is scoped to the caller's own linked ClientPortal by the service,
// the same self-service pattern as GET /employees/me.
clientPortalRouter.get('/me', asyncHandler(getOwnProfile));
clientPortalRouter.get('/finance-documents', validate({ query: listOwnFinanceDocumentsQuerySchema }), asyncHandler(listOwnFinanceDocuments));
clientPortalRouter.get('/finance-documents/:id', validate({ params: idParamSchema }), asyncHandler(getOwnFinanceDocument));
clientPortalRouter.get('/projects', validate({ query: listOwnProjectsQuerySchema }), asyncHandler(listOwnProjects));
