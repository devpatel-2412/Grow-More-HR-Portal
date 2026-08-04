import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, type CreateFinanceDocumentPayload, type RecordPaymentPayload } from '../api/finance.api';
import type { FinanceType, FinanceStatus } from '../types/finance.types';

const FINANCE_KEY = ['finance'];

export function useFinanceDocuments(query: { page: number; limit: number; type?: FinanceType; status?: FinanceStatus }) {
  return useQuery({
    queryKey: ['finance', 'list', query],
    queryFn: () => financeApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useFinanceDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'detail', id],
    queryFn: () => financeApi.get(id!),
    enabled: !!id,
  });
}

export function useFinanceSummary() {
  return useQuery({ queryKey: ['finance', 'summary'], queryFn: () => financeApi.summary() });
}

export function useProfitAndLoss(query: { from: string; to: string }) {
  return useQuery({
    queryKey: ['finance', 'profit-loss', query],
    queryFn: () => financeApi.profitAndLoss(query),
  });
}

export function useCreateFinanceDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFinanceDocumentPayload) => financeApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FINANCE_KEY }),
  });
}

export function useSendFinanceDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.send(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FINANCE_KEY }),
  });
}

export function useVoidFinanceDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.void(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FINANCE_KEY }),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordPaymentPayload }) => financeApi.recordPayment(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FINANCE_KEY }),
  });
}
