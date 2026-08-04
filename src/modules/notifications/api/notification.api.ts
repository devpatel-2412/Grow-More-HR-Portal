import { api } from '../../../shared/lib/api-client';
import type { NotificationRecord } from '../types/notification.types';

export const notificationApi = {
  list: (query: { page: number; limit: number; unreadOnly?: boolean }) =>
    api.getPaginated<NotificationRecord>('/notifications', query),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.post<NotificationRecord>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ message: string }>('/notifications/read-all'),
};
