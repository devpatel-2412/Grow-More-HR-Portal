import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  listInventoryItemsQuerySchema,
  stockInSchema,
  stockOutSchema,
  adjustStockSchema,
  itemIdParamSchema,
} from './inventory.validators.js';
import {
  createInventoryItem,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  listInventoryItems,
  stockIn,
  stockOut,
  adjustStock,
  listInventoryTransactions,
} from './inventory.controller.js';

const manage = requirePermission(PERMISSIONS.INVENTORY_MANAGE);

export const inventoryRouter = Router();
inventoryRouter.use(authenticateAccessToken);
inventoryRouter.use(requireStaff); // stock records — never visible to a CLIENT portal login

inventoryRouter.get('/', validate({ query: listInventoryItemsQuerySchema }), asyncHandler(listInventoryItems));
inventoryRouter.post('/', manage, validate({ body: createInventoryItemSchema }), asyncHandler(createInventoryItem));
inventoryRouter.get('/:id', validate({ params: itemIdParamSchema }), asyncHandler(getInventoryItem));
inventoryRouter.patch(
  '/:id',
  manage,
  validate({ params: itemIdParamSchema, body: updateInventoryItemSchema }),
  asyncHandler(updateInventoryItem),
);
inventoryRouter.delete('/:id', manage, validate({ params: itemIdParamSchema }), asyncHandler(deleteInventoryItem));

inventoryRouter.get(
  '/:id/transactions',
  validate({ params: itemIdParamSchema }),
  asyncHandler(listInventoryTransactions),
);
inventoryRouter.post(
  '/:id/stock-in',
  manage,
  validate({ params: itemIdParamSchema, body: stockInSchema }),
  asyncHandler(stockIn),
);
inventoryRouter.post(
  '/:id/stock-out',
  manage,
  validate({ params: itemIdParamSchema, body: stockOutSchema }),
  asyncHandler(stockOut),
);
inventoryRouter.post(
  '/:id/adjust',
  manage,
  validate({ params: itemIdParamSchema, body: adjustStockSchema }),
  asyncHandler(adjustStock),
);
