import type { Request, Response } from 'express';
import { inventoryService } from './inventory.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  listInventoryItemsQuerySchema,
  stockInSchema,
  stockOutSchema,
  adjustStockSchema,
} from './inventory.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createInventoryItemSchema>;
  sendCreated(res, await inventoryService.create(req.user!.tenantId, body, requestMeta(req)));
}

export async function getInventoryItem(req: Request, res: Response): Promise<void> {
  sendOk(res, await inventoryService.requireItem(req.user!.tenantId, req.params.id));
}

export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateInventoryItemSchema>;
  sendOk(res, await inventoryService.update(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
  await inventoryService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listInventoryItems(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listInventoryItemsQuerySchema>;
  const { rows, meta } = await inventoryService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function stockIn(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof stockInSchema>;
  sendOk(res, await inventoryService.stockIn(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function stockOut(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof stockOutSchema>;
  sendOk(res, await inventoryService.stockOut(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function adjustStock(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof adjustStockSchema>;
  sendOk(res, await inventoryService.adjustStock(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function listInventoryTransactions(req: Request, res: Response): Promise<void> {
  sendOk(res, await inventoryService.listTransactions(req.user!.tenantId, req.params.id));
}
