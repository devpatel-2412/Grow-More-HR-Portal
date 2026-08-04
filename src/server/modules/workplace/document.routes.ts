import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createDocumentSchema, replaceDocumentFileSchema, listDocumentsQuerySchema, idParamSchema } from './document.validators.js';
import {
  uploadDocument,
  getDocument,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  replaceDocumentFile,
  listDocumentVersions,
  listDocuments,
} from './document.controller.js';

const manage = requirePermission(PERMISSIONS.DOCUMENT_MANAGE);

export const documentRouter = Router();
documentRouter.use(authenticateAccessToken);
documentRouter.use(requireStaff); // internal document store — never visible to a CLIENT portal login

// Same pattern as the knowledge base — read is tenant-wide for every employee, write is gated.
// There is no per-document access-control list here; that is a real limitation, not an oversight.
documentRouter.post('/', manage, validate({ body: createDocumentSchema }), asyncHandler(uploadDocument));
documentRouter.get('/', validate({ query: listDocumentsQuerySchema }), asyncHandler(listDocuments));
documentRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getDocument));
documentRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteDocument));
documentRouter.post('/:id/archive', manage, validate({ params: idParamSchema }), asyncHandler(archiveDocument));
documentRouter.post('/:id/restore', manage, validate({ params: idParamSchema }), asyncHandler(restoreDocument));
documentRouter.post(
  '/:id/replace',
  manage,
  validate({ params: idParamSchema, body: replaceDocumentFileSchema }),
  asyncHandler(replaceDocumentFile),
);
documentRouter.get('/:id/versions', validate({ params: idParamSchema }), asyncHandler(listDocumentVersions));
