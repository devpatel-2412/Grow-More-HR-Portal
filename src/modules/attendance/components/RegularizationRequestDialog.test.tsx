import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegularizationRequestDialog } from './RegularizationRequestDialog';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('RegularizationRequestDialog', () => {
  it('validates that a reason and at least one corrected time are required', async () => {
    server.use(handlers.meSuccessWithPermissions(['attendance:regularization:create']));
    const user = userEvent.setup();
    renderWithProviders(<RegularizationRequestDialog />);

    await user.click(await screen.findByRole('button', { name: /request correction/i }));
    expect(await screen.findByText(/request an attendance correction/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^date$/i), '2026-01-05');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    expect(await screen.findByText(/provide a corrected check-in or check-out time/i)).toBeInTheDocument();
  });

  it('submits successfully with a reason and a corrected check-in time', async () => {
    server.use(handlers.meSuccessWithPermissions(['attendance:regularization:create']), handlers.regularizationRequestSuccess);
    const user = userEvent.setup();
    renderWithProviders(<RegularizationRequestDialog />);

    await user.click(await screen.findByRole('button', { name: /request correction/i }));
    await user.type(await screen.findByLabelText(/^date$/i), '2026-01-05');
    await user.type(screen.getByLabelText(/corrected check-in/i), '2026-01-05T09:30');
    await user.type(screen.getByLabelText(/reason/i), 'Forgot to punch in');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(screen.queryByText(/request an attendance correction/i)).not.toBeInTheDocument();
    });
  });
});
