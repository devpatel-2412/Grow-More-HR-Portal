import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useUnreadCount, useNotificationList, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications';
import { Button } from '../../../shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../../shared/components/ui/dropdown-menu';
import { cn } from '../../../shared/utils/cn';
import type { NotificationRecord } from '../types/notification.types';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount();
  const { data: list, isLoading } = useNotificationList(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const count = unread?.count ?? 0;

  function handleSelect(notification: NotificationRecord) {
    if (!notification.readAt) markRead.mutate(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'} className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[9px] font-bold text-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading && <p className="p-4 text-center text-xs text-[var(--muted-foreground)]">Loading&hellip;</p>}

        {!isLoading && list && list.data.length === 0 && (
          <p className="p-4 text-center text-xs text-[var(--muted-foreground)]">You're all caught up.</p>
        )}

        {!isLoading && list && list.data.length > 0 && (
          <ul className="max-h-80 overflow-y-auto">
            {list.data.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(notification)}
                  className={cn(
                    'flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-xs hover:bg-[var(--muted)]',
                    !notification.readAt && 'bg-[var(--muted)]/60',
                  )}
                >
                  <span className="flex w-full items-center gap-1.5 font-semibold text-[var(--foreground)]">
                    {!notification.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" aria-hidden="true" />}
                    {notification.title}
                  </span>
                  <span className="text-[var(--muted-foreground)]">{notification.body}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{timeAgo(notification.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
