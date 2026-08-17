import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ProjectDetailPage } from './ProjectDetailPage';
import { renderWithProviders } from '../../../test/test-utils';
import { server } from '../../../test/msw/server';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'proj-1' }) };
});

const project = {
  id: 'proj-1',
  name: 'Website Relaunch',
  description: 'Relaunch the marketing site',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: null,
  status: 'IN_PROGRESS',
};

// Mirrors the real GET /tasks (list) response: TaskRepository.findMany queries Prisma without
// `include: { subtasks: true }`, so list rows genuinely have no `subtasks` key — unlike the
// single-task GET /tasks/:id endpoint, which does include it.
const dueSoon = new Date();
const taskRow = {
  id: 'task-1',
  projectId: 'proj-1',
  title: 'Test',
  description: null,
  priority: 'LOW',
  status: 'REVIEW',
  dueDate: dueSoon.toISOString(),
  assignedToId: null,
  loggedHours: 0,
  parentTaskId: null,
  createdAt: '2026-08-01T00:00:00.000Z',
};

function mockProjectDetailEndpoints() {
  server.use(
    http.get('/api/v1/projects/proj-1', () => HttpResponse.json({ data: project })),
    http.get('/api/v1/tasks', () => HttpResponse.json({ data: [taskRow], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } })),
    http.get('/api/v1/tasks/:id/comments', () => HttpResponse.json({ data: [] })),
    http.get('/api/v1/tasks/:id/attachments', () => HttpResponse.json({ data: [] })),
  );
}

describe('ProjectDetailPage — task drawer regression (subtasks missing from list response)', () => {
  it('opens the task drawer from the Kanban board without crashing', async () => {
    mockProjectDetailEndpoints();
    const user = userEvent.setup();
    renderWithProviders(<ProjectDetailPage />, { route: '/projects/proj-1' });

    await user.click(await screen.findByText('Test'));

    expect(await screen.findByText('No checklist items.')).toBeInTheDocument();
  });

  it('opens the task drawer from the List view without crashing', async () => {
    mockProjectDetailEndpoints();
    const user = userEvent.setup();
    renderWithProviders(<ProjectDetailPage />, { route: '/projects/proj-1' });

    await user.click(await screen.findByRole('tab', { name: 'List' }));
    await user.click(await screen.findByRole('button', { name: 'Open task Test' }));

    expect(await screen.findByText('No checklist items.')).toBeInTheDocument();
  });

  it('opens the task drawer from the Calendar view without crashing', async () => {
    mockProjectDetailEndpoints();
    const user = userEvent.setup();
    renderWithProviders(<ProjectDetailPage />, { route: '/projects/proj-1' });

    await user.click(await screen.findByRole('tab', { name: 'Calendar' }));
    await user.click(await screen.findByRole('button', { name: 'Test' }));

    expect(await screen.findByText('No checklist items.')).toBeInTheDocument();
  });
});
