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
  convertLeadSchema,
  createClientSchema,
  updateClientSchema,
  listClientsQuerySchema,
  createContactSchema,
  logActivitySchema,
  listActivitiesQuerySchema,
  idParamSchema,
} from './crm.validators.js';
import {
  createLead,
  getLead,
  updateLead,
  changeLeadStage,
  convertLead,
  deleteLead,
  listLeads,
  getLeadPipeline,
  createClient,
  getClient,
  updateClient,
  deleteClient,
  listClients,
  addContact,
  deleteContact,
  logActivity,
  listActivities,
} from './crm.controller.js';

const manage = requirePermission(PERMISSIONS.CRM_MANAGE);
const read = requirePermission(PERMISSIONS.CRM_READ);

export const leadRouter = Router();
leadRouter.use(authenticateAccessToken);
leadRouter.post('/', manage, validate({ body: createLeadSchema }), asyncHandler(createLead));
leadRouter.get('/pipeline', read, asyncHandler(getLeadPipeline));
leadRouter.get('/', read, validate({ query: listLeadsQuerySchema }), asyncHandler(listLeads));
leadRouter.get('/:id', read, validate({ params: idParamSchema }), asyncHandler(getLead));
leadRouter.patch('/:id/stage', manage, validate({ params: idParamSchema, body: changeLeadStageSchema }), asyncHandler(changeLeadStage));
leadRouter.post('/:id/convert', manage, validate({ params: idParamSchema, body: convertLeadSchema }), asyncHandler(convertLead));
leadRouter.patch('/:id', manage, validate({ params: idParamSchema, body: updateLeadSchema }), asyncHandler(updateLead));
leadRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteLead));

export const clientRouter = Router();
clientRouter.use(authenticateAccessToken);
clientRouter.post('/', manage, validate({ body: createClientSchema }), asyncHandler(createClient));
clientRouter.get('/', read, validate({ query: listClientsQuerySchema }), asyncHandler(listClients));
clientRouter.get('/:id', read, validate({ params: idParamSchema }), asyncHandler(getClient));
clientRouter.patch('/:id', manage, validate({ params: idParamSchema, body: updateClientSchema }), asyncHandler(updateClient));
clientRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteClient));
clientRouter.post('/:id/contacts', manage, validate({ params: idParamSchema, body: createContactSchema }), asyncHandler(addContact));

export const crmContactRouter = Router();
crmContactRouter.use(authenticateAccessToken);
crmContactRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteContact));

export const crmActivityRouter = Router();
crmActivityRouter.use(authenticateAccessToken);
crmActivityRouter.post('/', manage, validate({ body: logActivitySchema }), asyncHandler(logActivity));
crmActivityRouter.get('/', read, validate({ query: listActivitiesQuerySchema }), asyncHandler(listActivities));
