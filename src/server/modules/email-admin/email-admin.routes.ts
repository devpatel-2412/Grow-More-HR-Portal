import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requireRole } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { emailTemplateTypeSchema, sendTestEmailSchema, listEmailLogsQuerySchema } from './email-admin.validators.js';
import { previewEmailTemplate, sendTestEmail, listEmailLogs } from './email-admin.controller.js';

export const emailAdminRouter = Router();

emailAdminRouter.use(authenticateAccessToken);
emailAdminRouter.use(requireRole('SUPER_ADMIN', 'ADMIN'));

emailAdminRouter.get('/templates/:type/preview', validate({ params: emailTemplateTypeSchema }), asyncHandler(previewEmailTemplate));
emailAdminRouter.post('/test', validate({ body: sendTestEmailSchema }), asyncHandler(sendTestEmail));
emailAdminRouter.get('/logs', validate({ query: listEmailLogsQuerySchema }), asyncHandler(listEmailLogs));
