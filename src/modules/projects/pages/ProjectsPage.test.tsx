import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ProjectsPage } from './ProjectsPage';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';

function mockProjectsList(data: unknown[]) {
  server.use(
    http.get('/api/v1/projects', () => HttpResponse.json({ data, meta: { page: 1, limit: 20, total: data.length, totalPages: 1 } })),
  );
}

const fullProject = {
  id: 'proj-1',
  name: 'Website Relaunch',
  description: null,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: null,
  status: 'IN_PROGRESS',
  progress: 50,
  openTasksCount: 3,
  totalTasksCount: 6,
  members: [{ id: 'emp-1', firstName: 'Ada', lastName: 'Lovelace' }],
  myOpenTasksCount: 1,
};

describe('ProjectsPage — permission-driven visibility', () => {
  it('shows the manager empty state and a New project button for a project:manage holder', async () => {
    server.use(handlers.meSuccessWithPermissions(['project:manage']));
    mockProjectsList([]);
    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
  });

  it('shows "No projects assigned" and hides the create button for a caller without project:manage', async () => {
    server.use(handlers.meSuccessWithPermissions([]));
    mockProjectsList([]);
    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByText('No projects assigned')).toBeInTheDocument();
    expect(screen.getByText(/you don't currently have any projects assigned to you/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument();
  });

  it('renders manager columns and actions (open tasks, members, edit, delete) for project:manage', async () => {
    server.use(handlers.meSuccessWithPermissions(['project:manage']));
    mockProjectsList([fullProject]);
    renderWithProviders(<ProjectsPage />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Website Relaunch')).toBeInTheDocument();
    expect(within(table).getByText('Open tasks')).toBeInTheDocument();
    expect(within(table).getByText('Members')).toBeInTheDocument();
    // The desktop table and the sm:hidden mobile-card layout both render these controls for the
    // same row (only one is visible per breakpoint, but both exist in the DOM) — assert at least one.
    expect(screen.getAllByRole('link', { name: /view website relaunch/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /edit website relaunch/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /delete website relaunch/i }).length).toBeGreaterThan(0);
  });

  it('renders the limited view (my open tasks, view only) for a caller without project:manage', async () => {
    server.use(handlers.meSuccessWithPermissions([]));
    mockProjectsList([fullProject]);
    renderWithProviders(<ProjectsPage />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Website Relaunch')).toBeInTheDocument();
    expect(within(table).getByText('My open tasks')).toBeInTheDocument();
    expect(within(table).queryByText('Members')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view website relaunch/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /edit website relaunch/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete website relaunch/i })).not.toBeInTheDocument();
  });
});
