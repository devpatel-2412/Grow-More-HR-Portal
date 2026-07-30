import { api } from '../../../shared/lib/api-client';
import type { FinanceDocumentRecord, FinanceSummaryRow, FinanceType, FinanceStatus } from '../types/finance.types';

export interface CreateFinanceDocumentPayload {
  type: FinanceType;
  issueDate: string;
  dueDate?: string;
  taxRate: number;
  notes?: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
}

export interface RecordPaymentPayload {
  amount: number;
  paidAt: string;
  method: string;
  reference?: string;
}

export const financeApi = {
  create: (payload: CreateFinanceDocumentPayload) => api.post<FinanceDocumentRecord>('/finance', payload),
  list: (query: { page: number; limit: number; type?: FinanceType; status?: FinanceStatus }) =>
    api.getPaginated<FinanceDocumentRecord>('/finance', query),
  get: (id: string) => api.get<FinanceDocumentRecord>(`/finance/${id}`),
  send: (id: string) => api.post<FinanceDocumentRecord>(`/finance/${id}/send`),
  void: (id: string) => api.post<FinanceDocumentRecord>(`/finance/${id}/void`),
  recordPayment: (id: string, payload: RecordPaymentPayload) =>
    api.post<FinanceDocumentRecord>(`/finance/${id}/payments`, payload),
  summary: () => api.get<FinanceSummaryRow[]>('/finance/summary'),
};
