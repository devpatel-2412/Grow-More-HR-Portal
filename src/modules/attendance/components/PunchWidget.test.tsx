import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { PunchWidget } from './PunchWidget';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

const PUNCHED_IN_RECORD = {
  id: 'att-1',
  employeeId: 'emp-1',
  date: '2026-01-01T00:00:00.000Z',
  checkIn: '2026-01-01T09:30:00.000Z',
  checkOut: null,
  status: 'PRESENT',
  lateMinutes: 0,
  overBreakMinutes: 0,
  requiredLogoutTime: '2026-01-01T18:30:00.000Z',
  breaks: [],
};

describe('PunchWidget', () => {
  it('shows the "punch in" state when there is no attendance record for today', async () => {
    server.use(handlers.attendanceTodayNotPunchedIn);
    renderWithProviders(<PunchWidget />);

    expect(await screen.findByText(/haven't punched in today/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /punch in/i })).toBeInTheDocument();
  });

  it('punching in switches to the punched-in state', async () => {
    // Stateful mock: /today reflects whatever the last punch-in call did, so the
    // invalidation-triggered refetch (which races with the test, not with userEvent) always
    // sees a state consistent with the mutation it followed.
    let punchedIn = false;
    server.use(
      http.get('/api/v1/attendance/today', () => HttpResponse.json({ data: punchedIn ? { ...PUNCHED_IN_RECORD, onBreak: false, liveRequiredLogoutTime: '2099-01-01T18:30:00.000Z', liveOverBreakMinutes: 0 } : null })),
      http.post('/api/v1/attendance/punch-in', () => {
        punchedIn = true;
        return HttpResponse.json({ data: PUNCHED_IN_RECORD }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<PunchWidget />);

    await user.click(await screen.findByRole('button', { name: /punch in/i }));

    await waitFor(() => {
      expect(screen.getByText(/punched in:/i)).toBeInTheDocument();
    });
  });

  it('shows the required-logout time and break/punch-out controls when already punched in', async () => {
    server.use(handlers.attendanceTodayPunchedIn);
    renderWithProviders(<PunchWidget />);

    expect(await screen.findByText(/required logout:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start break/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /punch out/i })).toBeInTheDocument();
  });
});
