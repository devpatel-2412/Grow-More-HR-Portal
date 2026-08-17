import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectFormDialog } from './ProjectFormDialog';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

describe('ProjectFormDialog', () => {
  it('validates the name and start date are required', async () => {
    server.use(handlers.meSuccessWithPermissions(['project:manage']));
    const user = userEvent.setup();
    renderWithProviders(<ProjectFormDialog />);

    await user.click(await screen.findByRole('button', { name: /new project/i }));
    await user.click(await screen.findByRole('button', { name: /create project/i }));

    expect(await screen.findAllByText(/^required$/i)).toHaveLength(2); // name + startDate
  });

  it('submits successfully with valid data', async () => {
    server.use(handlers.meSuccessWithPermissions(['project:manage']), handlers.projectCreateSuccess);
    const user = userEvent.setup();
    renderWithProviders(<ProjectFormDialog />);

    await user.click(await screen.findByRole('button', { name: /new project/i }));
    await user.type(await screen.findByLabelText(/^name$/i), 'Website Relaunch');
    await user.type(screen.getByLabelText(/start date/i), '2026-03-01');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders nothing when the user lacks project:manage', async () => {
    server.use(handlers.meSuccessWithPermissions([]));
    renderWithProviders(<ProjectFormDialog />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument();
    });
  });
});
