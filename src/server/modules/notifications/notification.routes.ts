import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { listNotificationsQuerySchema, idParamSchema } from './notification.validators.js';
import { listNotifications, unreadCount, markNotificationRead, markAllNotificationsRead } from './notification.controller.js';

export const notificationRouter = Router();
notificationRouter.use(authenticateAccessToken);

notificationRouter.get('/', validate({ query: listNotificationsQuerySchema }), asyncHandler(listNotifications));
notificationRouter.get('/unread-count', asyncHandler(unreadCount));
notificationRouter.post('/read-all', asyncHandler(markAllNotificationsRead));
notificationRouter.post('/:id/read', validate({ params: idParamSchema }), asyncHandler(markNotificationRead));
