import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { renderWithProviders } from '../../../test/test-utils';
import { server } from '../../../test/msw/server';
import type { TaskRecord } from '../types/task.types';

// The list endpoint (GET /tasks) never includes `subtasks` — only the single-task detail
// endpoint does (see task.repository.ts findMany vs findById). Kanban/List/Calendar open the
// drawer with the list-sourced object directly, so `subtasks` is routinely undefined here.
function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Test',
    description: null,
    priority: 'LOW',
    status: 'REVIEW',
    dueDate: null,
    assignedToId: null,
    loggedHours: 0,
    parentTaskId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockTaskDetailEndpoints() {
  server.use(
    http.get('/api/v1/tasks/:id/comments', () => HttpResponse.json({ data: [] })),
    http.get('/api/v1/tasks/:id/attachments', () => HttpResponse.json({ data: [] })),
  );
}

describe('TaskDetailDrawer', () => {
  it('opens without crashing when subtasks is undefined (real shape from the list endpoint)', () => {
    mockTaskDetailEndpoints();
    const task = makeTask();
    expect(task.subtasks).toBeUndefined();

    renderWithProviders(<TaskDetailDrawer task={task} onClose={() => {}} />);

    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('No checklist items.')).toBeInTheDocument();
  });

  it('opens without crashing when subtasks is null', () => {
    mockTaskDetailEndpoints();
    const task = makeTask({ subtasks: null as unknown as TaskRecord[] | undefined });

    renderWithProviders(<TaskDetailDrawer task={task} onClose={() => {}} />);

    expect(screen.getByText('No checklist items.')).toBeInTheDocument();
  });

  it('opens without crashing when subtasks is an empty array', () => {
    mockTaskDetailEndpoints();
    const task = makeTask({ subtasks: [] });

    renderWithProviders(<TaskDetailDrawer task={task} onClose={() => {}} />);

    expect(screen.getByText('No checklist items.')).toBeInTheDocument();
  });

  it('renders checklist items when subtasks are present', () => {
    mockTaskDetailEndpoints();
    const task = makeTask({
      subtasks: [makeTask({ id: 'sub-1', title: 'Subtask one', status: 'TODO' })],
    });

    renderWithProviders(<TaskDetailDrawer task={task} onClose={() => {}} />);

    expect(screen.getByText('Subtask one')).toBeInTheDocument();
    expect(screen.queryByText('No checklist items.')).not.toBeInTheDocument();
  });

  it('renders nothing when task is null', () => {
    mockTaskDetailEndpoints();
    renderWithProviders(<TaskDetailDrawer task={null} onClose={() => {}} />);

    expect(screen.queryByText('No checklist items.')).not.toBeInTheDocument();
  });
});
