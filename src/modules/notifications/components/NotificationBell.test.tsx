import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { useUnreadCount, useNotificationList, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useNotifications';

vi.mock('../hooks/useNotifications');
const mockUnread = vi.mocked(useUnreadCount);
const mockList = vi.mocked(useNotificationList);
const mockMarkRead = vi.mocked(useMarkNotificationRead);
const mockMarkAllRead = vi.mocked(useMarkAllNotificationsRead);

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

describe('NotificationBell', () => {
  it('shows the unread count badge when there are unread notifications', () => {
    mockUnread.mockReturnValue({ data: { count: 3 } } as never);
    mockList.mockReturnValue({ data: undefined, isLoading: false } as never);
    mockMarkRead.mockReturnValue({ mutate: vi.fn() } as never);
    mockMarkAllRead.mockReturnValue({ mutate: vi.fn() } as never);

    renderBell();
    expect(screen.getByLabelText('Notifications, 3 unread')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows no badge when there are zero unread notifications', () => {
    mockUnread.mockReturnValue({ data: { count: 0 } } as never);
    mockList.mockReturnValue({ data: undefined, isLoading: false } as never);
    mockMarkRead.mockReturnValue({ mutate: vi.fn() } as never);
    mockMarkAllRead.mockReturnValue({ mutate: vi.fn() } as never);

    renderBell();
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('shows an empty state when opened with no notifications', async () => {
    const user = userEvent.setup();
    mockUnread.mockReturnValue({ data: { count: 0 } } as never);
    mockList.mockReturnValue({ data: { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }, isLoading: false } as never);
    mockMarkRead.mockReturnValue({ mutate: vi.fn() } as never);
    mockMarkAllRead.mockReturnValue({ mutate: vi.fn() } as never);

    renderBell();
    await user.click(screen.getByLabelText('Notifications'));
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });

  it('marks a notification read and navigates to its link when clicked', async () => {
    const user = userEvent.setup();
    const markReadMutate = vi.fn();
    mockUnread.mockReturnValue({ data: { count: 1 } } as never);
    mockList.mockReturnValue({
      data: {
        data: [
          {
            id: 'n1',
            tenantId: 't1',
            userId: 'u1',
            type: 'TASK_ASSIGNED',
            title: 'New task assigned to you',
            body: 'Design homepage',
            link: '/projects/proj-1',
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
    } as never);
    mockMarkRead.mockReturnValue({ mutate: markReadMutate } as never);
    mockMarkAllRead.mockReturnValue({ mutate: vi.fn() } as never);

    renderBell();
    await user.click(screen.getByLabelText('Notifications, 1 unread'));
    const item = await screen.findByText('New task assigned to you');
    await user.click(item);

    expect(markReadMutate).toHaveBeenCalledWith('n1');
  });

  it('does not re-mark an already-read notification as read when clicked', async () => {
    const user = userEvent.setup();
    const markReadMutate = vi.fn();
    mockUnread.mockReturnValue({ data: { count: 0 } } as never);
    mockList.mockReturnValue({
      data: {
        data: [
          {
            id: 'n1',
            tenantId: 't1',
            userId: 'u1',
            type: 'GENERIC',
            title: 'Already read',
            body: 'x',
            link: null,
            readAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
    } as never);
    mockMarkRead.mockReturnValue({ mutate: markReadMutate } as never);
    mockMarkAllRead.mockReturnValue({ mutate: vi.fn() } as never);

    renderBell();
    await user.click(screen.getByLabelText('Notifications'));
    const item = await screen.findByText('Already read');
    await user.click(item);

    await waitFor(() => expect(markReadMutate).not.toHaveBeenCalled());
  });

  it('calls markAllRead when "Mark all read" is clicked', async () => {
    const user = userEvent.setup();
    const markAllReadMutate = vi.fn();
    mockUnread.mockReturnValue({ data: { count: 2 } } as never);
    mockList.mockReturnValue({ data: { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }, isLoading: false } as never);
    mockMarkRead.mockReturnValue({ mutate: vi.fn() } as never);
    mockMarkAllRead.mockReturnValue({ mutate: markAllReadMutate } as never);

    renderBell();
    await user.click(screen.getByLabelText('Notifications, 2 unread'));
    await user.click(await screen.findByText('Mark all read'));

    expect(markAllReadMutate).toHaveBeenCalledOnce();
  });
});
