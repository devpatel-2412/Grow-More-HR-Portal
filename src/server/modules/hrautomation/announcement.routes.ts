import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createAnnouncementSchema, listAnnouncementsQuerySchema, idParamSchema } from './announcement.validators.js';
import { publishAnnouncement, deleteAnnouncement, listAnnouncements } from './announcement.controller.js';

const manage = requirePermission(PERMISSIONS.ANNOUNCEMENT_MANAGE);

export const announcementRouter = Router();
announcementRouter.use(authenticateAccessToken);
announcementRouter.use(requireStaff); // internal announcements — never visible to a CLIENT portal login

// Reading the board is open to every employee; only publishing/removing needs ANNOUNCEMENT_MANAGE.
announcementRouter.post('/', manage, validate({ body: createAnnouncementSchema }), asyncHandler(publishAnnouncement));
announcementRouter.get('/', validate({ query: listAnnouncementsQuerySchema }), asyncHandler(listAnnouncements));
announcementRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteAnnouncement));
