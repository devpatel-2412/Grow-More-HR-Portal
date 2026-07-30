import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createDocumentSchema, listDocumentsQuerySchema, idParamSchema } from './document.validators.js';
import { uploadDocument, getDocument, deleteDocument, listDocuments } from './document.controller.js';

const manage = requirePermission(PERMISSIONS.DOCUMENT_MANAGE);

export const documentRouter = Router();
documentRouter.use(authenticateAccessToken);

// Same pattern as the knowledge base — read is tenant-wide for every employee, write is gated.
// There is no per-document access-control list here; that is a real limitation, not an oversight.
documentRouter.post('/', manage, validate({ body: createDocumentSchema }), asyncHandler(uploadDocument));
documentRouter.get('/', validate({ query: listDocumentsQuerySchema }), asyncHandler(listDocuments));
documentRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getDocument));
documentRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteDocument));
