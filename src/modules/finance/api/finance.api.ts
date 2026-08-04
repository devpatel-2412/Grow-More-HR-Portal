import { api, toQueryString } from '../../../shared/lib/api-client';
import type { FinanceDocumentRecord, FinanceSummaryRow, FinanceType, FinanceStatus, ProfitAndLossReport } from '../types/finance.types';

export interface CreateFinanceDocumentPayload {
  type: FinanceType;
  issueDate: string;
  dueDate?: string;
  taxRate: number;
  placeOfSupplyStateCode?: string;
  notes?: string;
  lineItems: { description: string; hsnCode?: string; quantity: number; unitPrice: number }[];
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
  profitAndLoss: (query: { from: string; to: string }) =>
    api.get<ProfitAndLossReport>(`/finance/reports/profit-loss${toQueryString(query)}`),
};
