import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createFinanceDocumentSchema,
  updateFinanceDocumentSchema,
  recordPaymentSchema,
  listFinanceDocumentsQuerySchema,
  idParamSchema,
} from './finance.validators.js';
import {
  createFinanceDocument,
  getFinanceDocument,
  updateFinanceDocument,
  sendFinanceDocument,
  voidFinanceDocument,
  deleteFinanceDocument,
  recordPayment,
  listFinanceDocuments,
  getFinanceSummary,
} from './finance.controller.js';

const manage = requirePermission(PERMISSIONS.FINANCE_MANAGE);
const read = requirePermission(PERMISSIONS.FINANCE_READ);

export const financeRouter = Router();
financeRouter.use(authenticateAccessToken);

financeRouter.post('/', manage, validate({ body: createFinanceDocumentSchema }), asyncHandler(createFinanceDocument));
financeRouter.get('/summary', read, asyncHandler(getFinanceSummary));
financeRouter.get('/', read, validate({ query: listFinanceDocumentsQuerySchema }), asyncHandler(listFinanceDocuments));
financeRouter.get('/:id', read, validate({ params: idParamSchema }), asyncHandler(getFinanceDocument));
financeRouter.patch(
  '/:id',
  manage,
  validate({ params: idParamSchema, body: updateFinanceDocumentSchema }),
  asyncHandler(updateFinanceDocument),
);
financeRouter.post('/:id/send', manage, validate({ params: idParamSchema }), asyncHandler(sendFinanceDocument));
financeRouter.post('/:id/void', manage, validate({ params: idParamSchema }), asyncHandler(voidFinanceDocument));
financeRouter.post(
  '/:id/payments',
  manage,
  validate({ params: idParamSchema, body: recordPaymentSchema }),
  asyncHandler(recordPayment),
);
financeRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteFinanceDocument));
