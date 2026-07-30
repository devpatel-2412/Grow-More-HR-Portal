import { api } from '../../../shared/lib/api-client';
import type { WorkReportRecord, WorkReportStatus } from '../types/workreport.types';

export interface ListWorkReportQuery {
  page: number;
  limit: number;
  employeeId?: string;
  status?: WorkReportStatus;
  from?: string;
  to?: string;
}

export interface SubmitWorkReportPayload {
  date: string;
  completedTasks: string[];
  pendingTasks: string[];
  tomorrowPlan: string[];
  issues?: string;
  timeSpentMinutes: number;
}

export const workReportApi = {
  submit: (payload: SubmitWorkReportPayload) => api.post<WorkReportRecord>('/work-reports', payload),
  list: (query: ListWorkReportQuery) => api.getPaginated<WorkReportRecord>('/work-reports', query),
  reviewQueue: (query: { page: number; limit: number }) =>
    api.getPaginated<WorkReportRecord>('/work-reports/review-queue', query),
  update: (id: string, payload: Partial<SubmitWorkReportPayload>) =>
    api.patch<WorkReportRecord>(`/work-reports/${id}`, payload),
  review: (id: string, status: 'APPROVED' | 'REJECTED', reviewNote?: string) =>
    api.patch<WorkReportRecord>(`/work-reports/${id}/review`, { status, reviewNote }),
};
