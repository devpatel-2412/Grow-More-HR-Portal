import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notification.api';

const UNREAD_COUNT_KEY = ['notifications', 'unread-count'];
const LIST_KEY = ['notifications', 'list'];

/** Polled, not just fetched once — the bell badge should catch up on its own if it's assigned a task while the tab is open. */
export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: () => notificationApi.unreadCount(),
    refetchInterval: 30_000,
  });
}

export function useNotificationList(enabled: boolean) {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => notificationApi.list({ page: 1, limit: 10 }),
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
