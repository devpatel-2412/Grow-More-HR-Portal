import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkReportDialog } from './WorkReportDialog';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('WorkReportDialog', () => {
  it('requires at least one completed item', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkReportDialog />);

    await user.click(screen.getByRole('button', { name: /submit report/i }));
    await user.click(await screen.findByRole('button', { name: /^submit report$/i, hidden: false }));

    expect(await screen.findByText(/list at least one thing you completed/i)).toBeInTheDocument();
  });

  it('submits and closes on success', async () => {
    server.use(handlers.workReportSubmitSuccess);
    const user = userEvent.setup();
    renderWithProviders(<WorkReportDialog />);

    await user.click(screen.getByRole('button', { name: /submit report/i }));
    await user.type(await screen.findByLabelText(/what you completed/i), 'Shipped the login page');
    await user.click(screen.getAllByRole('button', { name: /^submit report$/i }).at(-1)!);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('surfaces the duplicate-report conflict from the server', async () => {
    server.use(handlers.workReportSubmitConflict);
    const user = userEvent.setup();
    renderWithProviders(<WorkReportDialog />);

    await user.click(screen.getByRole('button', { name: /submit report/i }));
    await user.type(await screen.findByLabelText(/what you completed/i), 'Duplicate entry');
    await user.click(screen.getAllByRole('button', { name: /^submit report$/i }).at(-1)!);

    expect(await screen.findByText(/already submitted a work report for this date/i)).toBeInTheDocument();
  });
});
