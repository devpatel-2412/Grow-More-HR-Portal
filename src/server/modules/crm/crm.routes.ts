import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createLeadSchema,
  updateLeadSchema,
  changeLeadStageSchema,
  listLeadsQuerySchema,
  logActivitySchema,
  listActivitiesQuerySchema,
  idParamSchema,
} from './crm.validators.js';
import { createLead, getLead, updateLead, changeLeadStage, deleteLead, listLeads, getLeadPipeline, logActivity, listActivities } from './crm.controller.js';

const manage = requirePermission(PERMISSIONS.CRM_MANAGE);
const read = requirePermission(PERMISSIONS.CRM_READ);

export const leadRouter = Router();
leadRouter.use(authenticateAccessToken);
leadRouter.post('/', manage, validate({ body: createLeadSchema }), asyncHandler(createLead));
leadRouter.get('/pipeline', read, asyncHandler(getLeadPipeline));
leadRouter.get('/', read, validate({ query: listLeadsQuerySchema }), asyncHandler(listLeads));
leadRouter.get('/:id', read, validate({ params: idParamSchema }), asyncHandler(getLead));
leadRouter.patch('/:id/stage', manage, validate({ params: idParamSchema, body: changeLeadStageSchema }), asyncHandler(changeLeadStage));
leadRouter.patch('/:id', manage, validate({ params: idParamSchema, body: updateLeadSchema }), asyncHandler(updateLead));
leadRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteLead));

export const crmActivityRouter = Router();
crmActivityRouter.use(authenticateAccessToken);
crmActivityRouter.post('/', manage, validate({ body: logActivitySchema }), asyncHandler(logActivity));
crmActivityRouter.get('/', read, validate({ query: listActivitiesQuerySchema }), asyncHandler(listActivities));
