import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  createCommentSchema,
  createAttachmentSchema,
} from './task.validators.js';
import {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  listTasks,
  addComment,
  listComments,
  addAttachment,
  listAttachments,
} from './task.controller.js';

export const taskRouter = Router();
taskRouter.use(authenticateAccessToken);

taskRouter.post('/', requirePermission(PERMISSIONS.TASK_MANAGE), validate({ body: createTaskSchema }), asyncHandler(createTask));
taskRouter.get('/', validate({ query: listTasksQuerySchema }), asyncHandler(listTasks));
taskRouter.get('/:id', validate({ params: taskIdParamSchema }), asyncHandler(getTask));
// Ownership-vs-permission split is enforced inside taskService.update, not at the route level —
// a task's own assignee may change status/loggedHours without TASK_MANAGE.
taskRouter.patch('/:id', validate({ params: taskIdParamSchema, body: updateTaskSchema }), asyncHandler(updateTask));
taskRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.TASK_MANAGE),
  validate({ params: taskIdParamSchema }),
  asyncHandler(deleteTask),
);

taskRouter.post('/:id/comments', validate({ params: taskIdParamSchema, body: createCommentSchema }), asyncHandler(addComment));
taskRouter.get('/:id/comments', validate({ params: taskIdParamSchema }), asyncHandler(listComments));

taskRouter.post(
  '/:id/attachments',
  validate({ params: taskIdParamSchema, body: createAttachmentSchema }),
  asyncHandler(addAttachment),
);
taskRouter.get('/:id/attachments', validate({ params: taskIdParamSchema }), asyncHandler(listAttachments));
