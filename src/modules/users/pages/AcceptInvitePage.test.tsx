import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { AcceptInvitePage } from './AcceptInvitePage';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

function renderPage(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/invite/accept" element={<AcceptInvitePage />} />
      <Route path="/login" element={<div>Login Page</div>} />
      <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
    </Routes>,
    { route },
  );
}

describe('AcceptInvitePage', () => {
  it('redirects to /login when there is no token in the URL', async () => {
    renderPage('/invite/accept');
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('validates required fields and submits successfully with a token present', async () => {
    server.use(handlers.acceptInviteSuccess);
    const user = userEvent.setup();
    renderPage('/invite/accept?token=valid-token-123');

    await user.click(screen.getByRole('button', { name: /activate account/i }));
    expect(await screen.findAllByText(/^required$/i)).toHaveLength(2); // firstName + lastName

    await user.type(screen.getByLabelText(/first name/i), 'Ada');
    await user.type(screen.getByLabelText(/last name/i), 'Admin');
    await user.type(screen.getByLabelText(/^password$/i), 'CorrectPassword123');
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('shows a server error for an invalid/expired token', async () => {
    server.use(handlers.acceptInviteInvalidToken);
    const user = userEvent.setup();
    renderPage('/invite/accept?token=expired-token');

    await user.type(screen.getByLabelText(/first name/i), 'Ada');
    await user.type(screen.getByLabelText(/last name/i), 'Admin');
    await user.type(screen.getByLabelText(/^password$/i), 'CorrectPassword123');
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    expect(await screen.findByText(/invalid or expired invite/i)).toBeInTheDocument();
  });
});
