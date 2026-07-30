import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  generateDocumentSchema,
  listGeneratedDocumentsQuerySchema,
  idParamSchema,
} from './template.validators.js';
import {
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  listTemplates,
  generateDocument,
  listGeneratedDocuments,
} from './template.controller.js';

const manage = requirePermission(PERMISSIONS.TEMPLATE_MANAGE);

export const templateRouter = Router();
templateRouter.use(authenticateAccessToken);
// Generating a formal HR document (offer/experience/relieving letters) is not self-service.
templateRouter.use(manage);

templateRouter.post('/', validate({ body: createTemplateSchema }), asyncHandler(createTemplate));
templateRouter.get('/', validate({ query: listTemplatesQuerySchema }), asyncHandler(listTemplates));
templateRouter.get(
  '/generated-documents',
  validate({ query: listGeneratedDocumentsQuerySchema }),
  asyncHandler(listGeneratedDocuments),
);
templateRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getTemplate));
templateRouter.patch('/:id', validate({ params: idParamSchema, body: updateTemplateSchema }), asyncHandler(updateTemplate));
templateRouter.delete('/:id', validate({ params: idParamSchema }), asyncHandler(deleteTemplate));
templateRouter.post(
  '/:id/generate',
  validate({ params: idParamSchema, body: generateDocumentSchema }),
  asyncHandler(generateDocument),
);
