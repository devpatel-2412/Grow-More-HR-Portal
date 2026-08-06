import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { renderWithProviders } from '../../../test/test-utils';
import { server } from '../../../test/msw/server';
import type { Tenant } from '../../auth/types/auth.types';

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't1',
    name: 'Acme Inc',
    domain: 'acme',
    logoUrl: null,
    primaryColor: '#16a34a',
    secondaryColor: '#0ea5e9',
    font: 'Inter',
    attendanceShiftStartMinutes: 540,
    attendanceRequiredWorkMinutes: 480,
    attendanceAllowedBreakMinutes: 60,
    attendanceBreakOverageExtendsLogout: true,
    gstin: null,
    gstStateCode: null,
    sessionTimeoutMinutes: 60,
    sessionWarningMinutes: 2,
    rememberMeDurationDays: 30,
    maxConcurrentSessions: null,
    ...overrides,
  };
}

describe('SecuritySettingsForm', () => {
  it('sends null for sessionTimeoutMinutes when "Never Expire" is selected', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.patch('/api/v1/tenants/:id', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: makeTenant() });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SecuritySettingsForm tenant={makeTenant()} />);

    await user.click(screen.getByLabelText(/session timeout/i));
    await user.click(screen.getByRole('option', { name: /never expire/i }));
    await user.click(screen.getByRole('button', { name: /save security settings/i }));

    await waitFor(() => expect(capturedBody).toBeDefined());
    expect(capturedBody?.sessionTimeoutMinutes).toBeNull();
  });

  it('sends the selected minute value for a fixed timeout option', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.patch('/api/v1/tenants/:id', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: makeTenant() });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SecuritySettingsForm tenant={makeTenant({ sessionTimeoutMinutes: 60 })} />);

    await user.click(screen.getByLabelText(/session timeout/i));
    await user.click(screen.getByRole('option', { name: '2 hours' }));
    await user.click(screen.getByRole('button', { name: /save security settings/i }));

    await waitFor(() => expect(capturedBody).toBeDefined());
    expect(capturedBody?.sessionTimeoutMinutes).toBe(120);
  });

  it('sends null for maxConcurrentSessions when left blank (unlimited)', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.patch('/api/v1/tenants/:id', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: makeTenant() });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SecuritySettingsForm tenant={makeTenant({ maxConcurrentSessions: 5 })} />);

    await user.clear(screen.getByLabelText(/maximum concurrent sessions/i));
    await user.click(screen.getByRole('button', { name: /save security settings/i }));

    await waitFor(() => expect(capturedBody).toBeDefined());
    expect(capturedBody?.maxConcurrentSessions).toBeNull();
  });

  it('asks for confirmation before force-logging-out all users, and does nothing if declined', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderWithProviders(<SecuritySettingsForm tenant={makeTenant()} />);

    await user.click(screen.getByRole('button', { name: /force logout all users/i }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });

  it('force-logs-out all users after confirming', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    let called = false;
    server.use(
      http.post('/api/v1/sessions/force-logout-all', () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<SecuritySettingsForm tenant={makeTenant()} />);

    await user.click(screen.getByRole('button', { name: /force logout all users/i }));

    await waitFor(() => expect(called).toBe(true));
    confirmSpy.mockRestore();
  });
});
