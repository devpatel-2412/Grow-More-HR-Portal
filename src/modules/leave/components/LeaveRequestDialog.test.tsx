import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaveRequestDialog } from './LeaveRequestDialog';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('LeaveRequestDialog', () => {
  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveRequestDialog />);

    await user.click(screen.getByRole('button', { name: /request leave/i }));
    expect(await screen.findByText(/goes to your manager first/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /submit request/i }));
    expect(await screen.findAllByText(/^required$/i)).toHaveLength(2); // startDate + endDate
  });

  it('hides the end-date field once "half day" is checked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeaveRequestDialog />);

    await user.click(screen.getByRole('button', { name: /request leave/i }));
    expect(await screen.findByLabelText(/end date/i)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /half day/i }));
    expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
  });

  it('submits successfully with valid data', async () => {
    server.use(handlers.leaveSubmitSuccess);
    const user = userEvent.setup();
    renderWithProviders(<LeaveRequestDialog />);

    await user.click(screen.getByRole('button', { name: /request leave/i }));
    await user.type(await screen.findByLabelText(/start date/i), '2026-02-10');
    await user.type(screen.getByLabelText(/end date/i), '2026-02-11');
    await user.type(screen.getByLabelText(/reason/i), 'Family trip');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(screen.queryByText(/goes to your manager first/i)).not.toBeInTheDocument();
    });
  });

  it('surfaces a server conflict for an overlapping request', async () => {
    server.use(handlers.leaveSubmitConflict);
    const user = userEvent.setup();
    renderWithProviders(<LeaveRequestDialog />);

    await user.click(screen.getByRole('button', { name: /request leave/i }));
    await user.type(await screen.findByLabelText(/start date/i), '2026-02-10');
    await user.type(screen.getByLabelText(/end date/i), '2026-02-11');
    await user.type(screen.getByLabelText(/reason/i), 'Family trip');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByText(/already have a leave request covering/i)).toBeInTheDocument();
  });
});
