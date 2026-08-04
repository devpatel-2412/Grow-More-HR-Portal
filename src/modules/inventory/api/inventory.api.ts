import { api } from '../../../shared/lib/api-client';
import type {
  VendorRecord,
  VendorStatus,
  InventoryItemRecord,
  InventoryTransactionRecord,
} from '../types/inventory.types';

export interface CreateVendorPayload {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}

export const vendorApi = {
  list: (query: { page: number; limit: number; search?: string; sort?: string; status?: VendorStatus }) =>
    api.getPaginated<VendorRecord>('/vendors', query),
  create: (payload: CreateVendorPayload) => api.post<VendorRecord>('/vendors', payload),
  update: (id: string, payload: Partial<CreateVendorPayload> & { status?: VendorStatus }) =>
    api.patch<VendorRecord>(`/vendors/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/vendors/${id}`),
};

export interface CreateInventoryItemPayload {
  name: string;
  sku: string;
  category?: string;
  unit?: string;
  reorderLevel?: number;
  unitCost?: number;
  vendorId?: string;
  openingQuantity?: number;
}

export const inventoryApi = {
  list: (query: { page: number; limit: number; search?: string; sort?: string; category?: string; vendorId?: string }) =>
    api.getPaginated<InventoryItemRecord>('/inventory-items', query),
  create: (payload: CreateInventoryItemPayload) => api.post<InventoryItemRecord>('/inventory-items', payload),
  update: (
    id: string,
    payload: Omit<Partial<CreateInventoryItemPayload>, 'vendorId'> & { vendorId?: string | null },
  ) => api.patch<InventoryItemRecord>(`/inventory-items/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/inventory-items/${id}`),
  stockIn: (id: string, payload: { quantity: number; vendorId?: string; reference?: string }) =>
    api.post<InventoryItemRecord>(`/inventory-items/${id}/stock-in`, payload),
  stockOut: (id: string, payload: { quantity: number; reference?: string }) =>
    api.post<InventoryItemRecord>(`/inventory-items/${id}/stock-out`, payload),
  adjust: (id: string, payload: { quantity: number; reference?: string }) =>
    api.post<InventoryItemRecord>(`/inventory-items/${id}/adjust`, payload),
  listTransactions: (id: string) => api.get<InventoryTransactionRecord[]>(`/inventory-items/${id}/transactions`),
};
