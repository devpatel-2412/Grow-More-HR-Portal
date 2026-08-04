import { api } from '../../../shared/lib/api-client';
import type { AdminDashboardSummary } from '../types/dashboard.types';

export const dashboardApi = {
  getAdminSummary: () => api.get<AdminDashboardSummary>('/dashboard/admin-summary'),
};
