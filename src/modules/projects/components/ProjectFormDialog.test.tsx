import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
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

  it('renders nothing in edit mode either when the user lacks project:manage', async () => {
    server.use(handlers.meSuccessWithPermissions([]));
    const project = {
      id: 'proj-1',
      name: 'Website Relaunch',
      description: null,
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: null,
      status: 'PLANNING' as const,
    };
    renderWithProviders(<ProjectFormDialog mode="edit" project={project} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /edit website relaunch/i })).not.toBeInTheDocument();
    });
  });

  it('edit mode pre-fills the form and submits an update', async () => {
    server.use(
      handlers.meSuccessWithPermissions(['project:manage']),
      http.patch('/api/v1/projects/proj-1', () =>
        HttpResponse.json({
          data: { id: 'proj-1', name: 'Website Relaunch v2', description: null, startDate: '2026-03-01T00:00:00.000Z', endDate: null, status: 'PLANNING' },
        }),
      ),
    );
    const project = {
      id: 'proj-1',
      name: 'Website Relaunch',
      description: null,
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: null,
      status: 'PLANNING' as const,
    };
    const user = userEvent.setup();
    renderWithProviders(<ProjectFormDialog mode="edit" project={project} />);

    await user.click(await screen.findByRole('button', { name: /edit website relaunch/i }));
    const nameInput = await screen.findByLabelText(/^name$/i);
    expect(nameInput).toHaveValue('Website Relaunch');
    await user.clear(nameInput);
    await user.type(nameInput, 'Website Relaunch v2');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
