import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('LoginForm', () => {
  it('shows validation errors for an empty submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /sign in to platform/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows validation error for a malformed email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/corporate email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password$/i), 'somepassword');
    await user.click(screen.getByRole('button', { name: /sign in to platform/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it('surfaces a server error message on invalid credentials', async () => {
    server.use(handlers.loginInvalidCredentials);
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/corporate email/i), 'admin@acme.com');
    await user.type(screen.getByLabelText(/^password$/i), 'WrongPassword1');
    await user.click(screen.getByRole('button', { name: /sign in to platform/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('submits valid credentials without client-side validation errors', async () => {
    server.use(handlers.loginSuccess);
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/corporate email/i), 'admin@acme.com');
    await user.type(screen.getByLabelText(/^password$/i), 'CorrectPassword123');
    await user.click(screen.getByRole('button', { name: /sign in to platform/i }));

    await waitFor(() => {
      expect(screen.queryByText(/enter a valid email address/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument();
    });
  });
});
