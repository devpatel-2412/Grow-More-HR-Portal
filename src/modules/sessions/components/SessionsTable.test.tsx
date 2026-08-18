import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SessionsTable } from './SessionsTable';
import { renderWithProviders } from '../../../test/test-utils';
import { server } from '../../../test/msw/server';
import type { ActiveSession } from '../types/session.types';

function makeSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    id: 'rt-1',
    userId: 'user-1',
    userName: 'Ada Admin',
    userEmail: 'ada@acme.com',
    avatarUrl: null,
    role: 'ADMIN',
    loginTime: '2026-08-01T10:00:00.000Z',
    lastActivity: '2026-08-05T10:00:00.000Z',
    browser: 'Chrome',
    device: 'Windows PC',
    ipAddress: '203.0.113.10',
    rememberMe: false,
    ...overrides,
  };
}

describe('SessionsTable', () => {
  it('renders each session row with user, timestamps, browser/device, and IP', () => {
    renderWithProviders(<SessionsTable sessions={[makeSession()]} currentUserId="someone-else" />);

    expect(screen.getByText('Ada Admin')).toBeInTheDocument();
    expect(screen.getByText('ada@acme.com')).toBeInTheDocument();
    expect(screen.getByText(/Chrome/)).toBeInTheDocument();
    expect(screen.getByText(/Windows PC/)).toBeInTheDocument();
    expect(screen.getByText('203.0.113.10')).toBeInTheDocument();
  });

  it('shows "Unknown" for a missing IP address', () => {
    renderWithProviders(<SessionsTable sessions={[makeSession({ ipAddress: null })]} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('does nothing when the force-logout confirmation is declined', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    let called = false;
    server.use(
      http.post('/api/v1/sessions/users/:userId/force-logout', () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SessionsTable sessions={[makeSession()]} />);

    await user.click(screen.getByRole('button', { name: /force logout/i }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(called).toBe(false);
    confirmSpy.mockRestore();
  });

  it('force-logs-out the session after confirming', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let capturedUserId: string | undefined;
    server.use(
      http.post('/api/v1/sessions/users/:userId/force-logout', ({ params }) => {
        capturedUserId = params.userId as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SessionsTable sessions={[makeSession({ userId: 'user-42' })]} />);

    await user.click(screen.getByRole('button', { name: /force logout/i }));

    await waitFor(() => expect(capturedUserId).toBe('user-42'));
    confirmSpy.mockRestore();
  });

  it('uses a distinct confirmation message when force-logging-out your own sessions', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderWithProviders(<SessionsTable sessions={[makeSession({ userId: 'self-id' })]} currentUserId="self-id" />);

    await user.click(screen.getByRole('button', { name: /force logout/i }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringMatching(/your own active sessions/i));
    confirmSpy.mockRestore();
  });
});
