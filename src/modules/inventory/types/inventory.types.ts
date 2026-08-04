export type VendorStatus = 'ACTIVE' | 'INACTIVE';

export interface VendorRecord {
  id: string;
  tenantId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstNumber: string | null;
  status: VendorStatus;
  notes: string | null;
  createdAt: string;
}

export interface InventoryItemRecord {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  category: string | null;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  vendorId: string | null;
  createdAt: string;
}

export type InventoryTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryTransactionRecord {
  id: string;
  tenantId: string;
  itemId: string;
  type: InventoryTransactionType;
  quantity: number;
  reference: string | null;
  vendorId: string | null;
  performedById: string | null;
  createdAt: string;
}
