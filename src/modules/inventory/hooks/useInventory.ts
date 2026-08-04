import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vendorApi,
  inventoryApi,
  type CreateVendorPayload,
  type CreateInventoryItemPayload,
} from '../api/inventory.api';
import type { VendorStatus } from '../types/inventory.types';

// ---------------------------------------------------------------- vendors

export function useVendors(query: { page: number; limit: number; search?: string; sort?: string; status?: VendorStatus }) {
  return useQuery({
    queryKey: ['inventory', 'vendors', query],
    queryFn: () => vendorApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVendorPayload) => vendorApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'vendors'] }),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<CreateVendorPayload> & { status?: VendorStatus } }) =>
      vendorApi.update(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'vendors'] }),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vendorApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'vendors'] }),
  });
}

// ---------------------------------------------------------------- inventory items

export function useInventoryItems(query: { page: number; limit: number; search?: string; sort?: string; category?: string; vendorId?: string }) {
  return useQuery({
    queryKey: ['inventory', 'items', query],
    queryFn: () => inventoryApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryItemPayload) => inventoryApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] }),
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Omit<Partial<CreateInventoryItemPayload>, 'vendorId'> & { vendorId?: string | null };
    }) => inventoryApi.update(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] }),
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] }),
  });
}

function invalidateItemState(queryClient: ReturnType<typeof useQueryClient>, itemId: string) {
  queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
  queryClient.invalidateQueries({ queryKey: ['inventory', 'transactions', itemId] });
}

export function useStockIn(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { quantity: number; vendorId?: string; reference?: string }) => inventoryApi.stockIn(itemId, payload),
    onSuccess: () => invalidateItemState(queryClient, itemId),
  });
}

export function useStockOut(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { quantity: number; reference?: string }) => inventoryApi.stockOut(itemId, payload),
    onSuccess: () => invalidateItemState(queryClient, itemId),
  });
}

export function useAdjustStock(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { quantity: number; reference?: string }) => inventoryApi.adjust(itemId, payload),
    onSuccess: () => invalidateItemState(queryClient, itemId),
  });
}

export function useInventoryTransactions(itemId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'transactions', itemId],
    queryFn: () => inventoryApi.listTransactions(itemId!),
    enabled: !!itemId,
  });
}
