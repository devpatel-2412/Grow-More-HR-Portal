import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { upload, MAX_UPLOAD_FILE_COUNT } from '../../shared/middleware/upload.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createDocumentSchema, listDocumentsQuerySchema, idParamSchema, versionIdParamSchema } from './document.validators.js';
import {
  uploadDocument,
  getDocument,
  downloadDocument,
  deleteDocument,
  archiveDocument,
  restoreDocument,
  replaceDocumentFile,
  listDocumentVersions,
  downloadDocumentVersion,
  listDocuments,
} from './document.controller.js';

const manage = requirePermission(PERMISSIONS.DOCUMENT_MANAGE);
const view = requireAnyPermission(PERMISSIONS.DOCUMENT_MANAGE, PERMISSIONS.DOCUMENT_VIEW_SELF);
const uploadPermission = requireAnyPermission(PERMISSIONS.DOCUMENT_MANAGE, PERMISSIONS.DOCUMENT_UPLOAD_SELF);

export const documentRouter = Router();
documentRouter.use(authenticateAccessToken);
documentRouter.use(requireStaff); // internal document store — never visible to a CLIENT portal login

// Same pattern as the knowledge base — read is tenant-wide for every employee, write is gated.
// There is no per-document access-control list here; that is a real limitation, not an oversight.
documentRouter.post(
  '/',
  uploadPermission,
  upload.array('files', MAX_UPLOAD_FILE_COUNT),
  validate({ body: createDocumentSchema }),
  asyncHandler(uploadDocument),
);
documentRouter.get('/', view, validate({ query: listDocumentsQuerySchema }), asyncHandler(listDocuments));
documentRouter.get('/:id', view, validate({ params: idParamSchema }), asyncHandler(getDocument));
documentRouter.get('/:id/download', view, validate({ params: idParamSchema }), asyncHandler(downloadDocument));
documentRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteDocument));
documentRouter.post('/:id/archive', manage, validate({ params: idParamSchema }), asyncHandler(archiveDocument));
documentRouter.post('/:id/restore', manage, validate({ params: idParamSchema }), asyncHandler(restoreDocument));
documentRouter.post(
  '/:id/replace',
  manage,
  upload.single('file'),
  validate({ params: idParamSchema }),
  asyncHandler(replaceDocumentFile),
);
documentRouter.get('/:id/versions', view, validate({ params: idParamSchema }), asyncHandler(listDocumentVersions));
documentRouter.get(
  '/:id/versions/:versionId/download',
  view,
  validate({ params: versionIdParamSchema }),
  asyncHandler(downloadDocumentVersion),
);
