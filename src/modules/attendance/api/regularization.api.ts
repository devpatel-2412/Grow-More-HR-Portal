import { api } from '../../../shared/lib/api-client';
import type { RegularizationRequestFormValues } from '../schemas/attendance.schemas';
import type { RegularizationRequest, RegularizationStatus } from '../types/attendance.types';

export interface ListRegularizationsQuery {
  page: number;
  limit: number;
  status?: RegularizationStatus;
}

export const regularizationApi = {
  request: (values: RegularizationRequestFormValues) =>
    api.post<RegularizationRequest>('/attendance/regularization', {
      date: values.date,
      requestedCheckIn: values.requestedCheckIn || undefined,
      requestedCheckOut: values.requestedCheckOut || undefined,
      reason: values.reason,
    }),
  list: (query: ListRegularizationsQuery) => api.getPaginated<RegularizationRequest>('/attendance/regularization', query),
  review: (id: string, status: Extract<RegularizationStatus, 'APPROVED' | 'REJECTED'>) =>
    api.patch<RegularizationRequest>(`/attendance/regularization/${id}`, { status }),
};
