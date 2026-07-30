import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteUserDialog } from './InviteUserDialog';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('InviteUserDialog', () => {
  it('opens the dialog, validates an empty email, and submits successfully', async () => {
    server.use(handlers.inviteUserSuccess);
    const user = userEvent.setup();
    renderWithProviders(<InviteUserDialog />);

    await user.click(screen.getByRole('button', { name: /invite user/i }));
    expect(await screen.findByText(/invite a teammate/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'new@acme.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(screen.queryByText(/invite a teammate/i)).not.toBeInTheDocument();
    });
  });

  it('surfaces a server conflict error without closing the dialog', async () => {
    server.use(handlers.inviteUserConflict);
    const user = userEvent.setup();
    renderWithProviders(<InviteUserDialog />);

    await user.click(screen.getByRole('button', { name: /invite user/i }));
    await user.type(await screen.findByLabelText(/email/i), 'existing@acme.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(await screen.findByText(/an account with this email already exists/i)).toBeInTheDocument();
    expect(screen.getByText(/invite a teammate/i)).toBeInTheDocument();
  });
});
