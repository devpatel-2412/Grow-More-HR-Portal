import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTicketDialog } from './CreateTicketDialog';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('CreateTicketDialog', () => {
  it('requires a subject and description', async () => {
    server.use(handlers.meSuccessWithPermissions(['ticket:create']));
    const user = userEvent.setup();
    renderWithProviders(<CreateTicketDialog />);

    await user.click(await screen.findByRole('button', { name: /new ticket/i }));
    await user.click(await screen.findByRole('button', { name: /^submit$/i }));

    expect(await screen.findAllByText(/^required$/i)).toHaveLength(2); // subject + description
  });

  it('submits successfully and closes the dialog', async () => {
    server.use(handlers.meSuccessWithPermissions(['ticket:create']), handlers.ticketCreateSuccess);
    const user = userEvent.setup();
    renderWithProviders(<CreateTicketDialog />);

    await user.click(await screen.findByRole('button', { name: /new ticket/i }));
    await user.type(await screen.findByLabelText(/subject/i), 'Laptop wont boot');
    await user.type(screen.getByLabelText(/description/i), 'Blue screen on startup');
    await user.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
