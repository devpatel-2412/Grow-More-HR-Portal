import { api, toQueryString } from '../../../shared/lib/api-client';
import type { TimeLogRecord, TimeSummary } from '../types/timelog.types';

export interface ListTimeLogQuery {
  page: number;
  limit: number;
  employeeId?: string;
  taskId?: string;
  from?: string;
  to?: string;
}

export interface ManualTimeLogPayload {
  taskId?: string;
  description?: string;
  startedAt: string;
  durationMinutes: number;
}

export type TimeSummaryQuery = Partial<Omit<ListTimeLogQuery, 'page' | 'limit'>>;

export const timeLogApi = {
  startTimer: (payload: { taskId?: string; description?: string }) =>
    api.post<TimeLogRecord>('/time-logs/timer/start', payload),
  stopTimer: (description?: string) => api.post<TimeLogRecord>('/time-logs/timer/stop', { description }),
  running: () => api.get<TimeLogRecord | null>('/time-logs/timer/running'),
  createManual: (payload: ManualTimeLogPayload) => api.post<TimeLogRecord>('/time-logs', payload),
  list: (query: ListTimeLogQuery) => api.getPaginated<TimeLogRecord>('/time-logs', query),
  summary: (query: TimeSummaryQuery) => api.get<TimeSummary>(`/time-logs/summary${toQueryString(query)}`),
  remove: (id: string) => api.delete<void>(`/time-logs/${id}`),
};
