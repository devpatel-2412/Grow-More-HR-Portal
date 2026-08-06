import { api } from '../../../shared/lib/api-client';
import type { ActiveSession } from '../types/session.types';

export const sessionApi = {
  list: () => api.get<ActiveSession[]>('/sessions'),
  forceLogoutUser: (userId: string) => api.post<void>(`/sessions/users/${userId}/force-logout`),
  forceLogoutAll: () => api.post<void>('/sessions/force-logout-all'),
};
